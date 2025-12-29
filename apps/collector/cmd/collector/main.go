package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type PullResponse struct {
	OK   bool `json:"ok"`
	Run  *struct {
		ID        int64 `json:"id"`
		JobID     int64 `json:"job_id"`
		TaskID    int64 `json:"task_id"`
		SourceID  int64 `json:"source_id"`
		CurrentPage int `json:"current_page"`
		TotalPages  int `json:"total_pages"`
	} `json:"run"`
	Job *struct {
		ID                 int64  `json:"id"`
		Name               string `json:"name"`
		DomainURL          string `json:"domain_url"`
		APIPass            string `json:"api_pass"`
		CollectTime        int    `json:"collect_time"`
		IntervalSeconds    int    `json:"interval_seconds"`
		PushWorkers        int    `json:"push_workers"`
		PushIntervalSecond int    `json:"push_interval_seconds"`
		MaxWorkers         int    `json:"max_workers"`
		FilterKeywords     string `json:"filter_keywords"`
		Cron               string `json:"cron"`
	} `json:"job"`
	Sources []struct {
		ID          int64  `json:"id"`
		Name        string `json:"name"`
		BaseURL     string `json:"base_url"`
		CollectType int    `json:"collect_type"` // 1=xml,2=json (we only use json for now)
	} `json:"sources"`
}

type ReportRequest struct {
	ID                int64  `json:"id"`
	TaskID            int64  `json:"task_id,omitempty"`
	Status            int    `json:"status,omitempty"` // 1=运行中,2=完成,3=失败
	ProgressPage      int    `json:"progress_page,omitempty"`
	ProgressTotalPage int    `json:"progress_total_pages,omitempty"`
	PushedCount       int    `json:"pushed_count,omitempty"`
	CreatedCount      int    `json:"created_count,omitempty"`
	UpdatedCount      int    `json:"updated_count,omitempty"`
	ErrorCount        int    `json:"error_count,omitempty"`
	Message           string `json:"message,omitempty"`
}

// FlexInt 处理可能是字符串或整数的 JSON 值
type FlexInt int

func (f *FlexInt) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), `"`)
	if s == "" || s == "null" {
		*f = 0
		return nil
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return err
	}
	*f = FlexInt(n)
	return nil
}

type ProvideListJSON struct {
	Code      FlexInt                  `json:"code"`
	Msg       string                   `json:"msg"`
	Page      FlexInt                  `json:"page"`
	PageCount FlexInt                  `json:"pagecount"`
	Limit     FlexInt                  `json:"limit"`
	Total     FlexInt                  `json:"total"`
	List      []map[string]interface{} `json:"list"`
}

type ReceiveResponse struct {
	Code FlexInt `json:"code"`
	Msg  string  `json:"msg"`
	// code 1=已创建, 2=已更新
}

func main() {
	var (
		apiBase   = flag.String("api-base", getenv("CMS_API_BASE", "http://localhost:3000"), "CMS API base url (e.g. http://localhost:3000)")
		token     = flag.String("token", getenv("COLLECTOR_WORKER_TOKEN", ""), "Collector worker token (same as API env COLLECTOR_WORKER_TOKEN)")
		workerID  = flag.String("worker-id", getenv("COLLECTOR_WORKER_ID", hostname()), "Worker id")
		once      = flag.Bool("once", false, "Run one task then exit (or exit if queue empty)")
		pollSleep = flag.Duration("poll-sleep", 5*time.Second, "Sleep when queue empty")
	)
	flag.Parse()

	if strings.TrimSpace(*token) == "" {
		fmt.Fprintln(os.Stderr, "ERROR: missing --token (COLLECTOR_WORKER_TOKEN)")
		os.Exit(2)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	for {
		task, err := pull(client, strings.TrimRight(*apiBase, "/"), *token, *workerID)
		if err != nil {
			fmt.Fprintln(os.Stderr, "pull error:", err)
			if *once {
				os.Exit(1)
			}
			time.Sleep(*pollSleep)
			continue
		}
		if task.Run == nil {
			if *once {
				return
			}
			time.Sleep(*pollSleep)
			continue
		}
		runID := task.Run.ID
		taskID := task.Run.TaskID

		if task.Job == nil {
			_ = report(client, strings.TrimRight(*apiBase, "/"), *token, ReportRequest{
				ID:      runID,
				TaskID:  taskID,
				Status:  3,
				Message: "job missing",
			})
			if *once {
				return
			}
			continue
		}
		if len(task.Sources) == 0 {
			_ = report(client, strings.TrimRight(*apiBase, "/"), *token, ReportRequest{
				ID:      runID,
				TaskID:  taskID,
				Status:  3,
				Message: "no sources bound",
			})
			if *once {
				return
			}
			continue
		}

		err = runOnce(client, strings.TrimRight(*apiBase, "/"), *token, runID, task)
		if err != nil {
			_ = report(client, strings.TrimRight(*apiBase, "/"), *token, ReportRequest{
				ID:      runID,
				TaskID:  taskID,
				Status:  3,
				Message: err.Error(),
			})
		} else {
			_ = report(client, strings.TrimRight(*apiBase, "/"), *token, ReportRequest{
				ID:      runID,
				TaskID:  taskID,
				Status:  2,
				Message: "done",
			})
		}

		if *once {
			return
		}
	}
}

func runOnce(client *http.Client, apiBase, token string, runID int64, task PullResponse) error {
	job := task.Job
	target := strings.TrimRight(job.DomainURL, "/") + "/api/receive/vod"
	if job.APIPass == "" {
		return fmt.Errorf("job api_pass empty")
	}

	pushInterval := time.Duration(max(0, job.PushIntervalSecond)) * time.Second
	if pushInterval == 0 {
		pushInterval = 50 * time.Millisecond
	}

	maxWorkers := max(1, job.MaxWorkers)
	if maxWorkers > 10 {
		maxWorkers = 10 // Cap at 10 to avoid overwhelming the API
	}

	filterKws := splitKeywords(job.FilterKeywords)

	// 仅处理来自任务的单个源
	if len(task.Sources) == 0 {
		return fmt.Errorf("no source provided")
	}

	src := task.Sources[0]
	base := strings.TrimRight(src.BaseURL, "/")
	if base == "" {
		return fmt.Errorf("source base_url empty")
	}

	// 使用运行中的 current_page 和 total_pages 进行可恢复的采集
	startPage := int64(task.Run.CurrentPage)
	if startPage < 1 {
		startPage = 1
	}
	pageCount := int64(task.Run.TotalPages)
	if pageCount < 1 {
		pageCount = 1
	}

	// 使用工作线程池进行并发页面获取
	type pageResult struct {
		page      int64
		items     []map[string]interface{}
		pageCount int64
		err       error
	}

	pageChan := make(chan int64, maxWorkers*2)
	resultChan := make(chan pageResult, maxWorkers*2)
	doneChan := make(chan struct{})

	// 启动工作线程
	for i := 0; i < maxWorkers; i++ {
		go func() {
			for page := range pageChan {
				listURL := buildProvideListURL(base, int(page), job.CollectTime)
				fmt.Printf("[Collector] Fetching list (worker): %s\n", listURL)
				body, err := httpGet(client, listURL)
				if err != nil {
					resultChan <- pageResult{page: page, err: err}
					continue
				}

				var resp ProvideListJSON
				if err := json.Unmarshal(body, &resp); err != nil {
					resultChan <- pageResult{page: page, err: err}
					continue
				}

				resultChan <- pageResult{
					page:      page,
					items:     resp.List,
					pageCount: int64(resp.PageCount),
				}
			}
		}()
	}

	// Send pages to workers (dynamically updated as pageCount changes)
	go func() {
		nextPage := startPage
		for {
			if nextPage <= pageCount {
				pageChan <- nextPage
				nextPage++
			} else {
				select {
				case <-doneChan:
					close(pageChan)
					return
				default:
					time.Sleep(100 * time.Millisecond)
				}
			}
		}
	}()

	// Collect results and push items
	pushed := 0
	created := 0
	updated := 0
	errors := 0
	skipped := 0
	lastErr := ""
	processedPages := 0
	maxPage := startPage
	hasError := false

	limiter := time.NewTicker(pushInterval)
	defer limiter.Stop()

	for {
		result := <-resultChan
		processedPages++

		if result.page > maxPage {
			maxPage = result.page
		}

		if result.err != nil {
			fmt.Printf("[Collector] Fetch error on page %d: %v\n", result.page, result.err)
			errors++
			lastErr = result.err.Error()
			hasError = true
			_ = report(client, apiBase, token, ReportRequest{
				ID:                runID,
				TaskID:            task.Run.TaskID,
				Status:            3,
				ProgressPage:      int(result.page),
				ProgressTotalPage: int(pageCount),
				PushedCount:       pushed,
				CreatedCount:      created,
				UpdatedCount:      updated,
				ErrorCount:        errors,
				Message:           fmt.Sprintf("source=%s page=%d fetch error: %v", src.Name, result.page, result.err),
			})
			continue
		}

		fmt.Printf("[Collector] Got %d items from page %d, pageCount=%d\n", len(result.items), result.page, result.pageCount)

		// Update pageCount if needed
		if result.pageCount > pageCount {
			pageCount = result.pageCount
		}

		// Push items
		for _, item := range result.items {
			if shouldSkip(item, filterKws) {
				skipped++
				continue
			}
			<-limiter.C
			code, err := pushVod(client, target, job.APIPass, src.ID, item)
			if err != nil {
				errors++
				lastErr = err.Error()
			} else {
				pushed++
				if code == 1 {
					created++
				} else if code == 2 {
					updated++
				}
			}
		}

		_ = report(client, apiBase, token, ReportRequest{
			ID:                runID,
			TaskID:            task.Run.TaskID,
			Status:            1,
			ProgressPage:      int(result.page),
			ProgressTotalPage: int(pageCount),
			PushedCount:       pushed,
			CreatedCount:      created,
			UpdatedCount:      updated,
			ErrorCount:        errors,
			Message:           fmt.Sprintf("source=%s page=%d/%d pushed=%d created=%d updated=%d skipped=%d errors=%d lastError=%s", src.Name, result.page, pageCount, pushed, created, updated, skipped, errors, lastErr),
		})

		// Check if all pages are done
		if result.page == pageCount && maxPage == pageCount {
			close(doneChan)
			break
		}
	}

	if hasError {
		return fmt.Errorf("collection completed with errors: %s", lastErr)
	}
	return nil
}

func splitKeywords(csv string) []string {
	parts := strings.Split(csv, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		s := strings.TrimSpace(p)
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}

func shouldSkip(item map[string]interface{}, kws []string) bool {
	if len(kws) == 0 {
		return false
	}
	name := strings.TrimSpace(fmt.Sprint(item["vod_name"]))
	if name == "" {
		return false
	}
	for _, kw := range kws {
		if kw != "" && strings.Contains(name, kw) {
			return true
		}
	}
	return false
}

func buildProvideListURL(base string, page int, collectTimeHours int) string {
	u, _ := url.Parse(base)
	// Normalize common inputs:
	// - https://site.com
	// - https://site.com/api.php
	// - https://site.com/api.php/provide/vod
	if u.Path == "" || u.Path == "/" || u.Path == "/api.php" || u.Path == "/api.php/" {
		u.Path = "/api.php/provide/vod/"
	}
	if u.Path == "/api.php/provide/vod" {
		u.Path = "/api.php/provide/vod/"
	}
	q := u.Query()
	if q.Get("ac") == "" {
		q.Set("ac", "detail") // Use detail to get full data (pic, play_url, content, etc.)
	}
	q.Set("pg", strconv.Itoa(page))
	q.Set("at", "json")
	if collectTimeHours > 0 {
		q.Set("h", strconv.Itoa(collectTimeHours))
	}
	u.RawQuery = q.Encode()
	return u.String()
}

func pushVod(client *http.Client, target string, pass string, sourceID int64, item map[string]interface{}) (int, error) {
	values := url.Values{}
	values.Set("pass", pass)
	values.Set("source_id", strconv.FormatInt(sourceID, 10))
	for k, v := range item {
		key := strings.TrimSpace(k)
		if key == "" {
			continue
		}
		if v == nil {
			continue
		}
		values.Set(key, fmt.Sprint(v))
	}

	fmt.Printf("[Collector] Pushing vod: %s, type_id=%v, vod_name=%v\n", target, item["type_id"], item["vod_name"])
	req, _ := http.NewRequest("POST", target, strings.NewReader(values.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("[Collector] Push error: %v\n", err)
		return 0, err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	fmt.Printf("[Collector] Push response: status=%d body=%s\n", resp.StatusCode, string(b))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return 0, fmt.Errorf("push status=%d body=%s", resp.StatusCode, string(b))
	}
	var rr ReceiveResponse
	if err := json.Unmarshal(b, &rr); err == nil {
		// MacCMS-style: code 1=add ok, 2=update ok; other codes are errors/skip.
		if rr.Code != 1 && rr.Code != 2 {
			msg := strings.TrimSpace(rr.Msg)
			if msg == "" {
				msg = string(b)
			}
			return 0, fmt.Errorf("receive code=%d msg=%s", rr.Code, msg)
		}
		return int(rr.Code), nil
	}
	return 0, nil
}

func pull(client *http.Client, apiBase, token, workerID string) (PullResponse, error) {
	var out PullResponse
	body, _ := json.Marshal(map[string]string{"worker_id": workerID})
	req, _ := http.NewRequest("POST", apiBase+"/collector/queue/pull", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	if err != nil {
		return out, err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if resp.StatusCode != 200 {
		return out, fmt.Errorf("pull status=%d body=%s", resp.StatusCode, string(b))
	}
	if err := json.Unmarshal(b, &out); err != nil {
		return out, err
	}
	return out, nil
}

func report(client *http.Client, apiBase, token string, reqBody ReportRequest) error {
	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", apiBase+"/collector/queue/report", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("report status=%d body=%s", resp.StatusCode, string(b))
	}
	return nil
}

func httpGet(client *http.Client, url string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		// 对于 403 错误，返回特殊错误以便调用者可以跳过而不是终止
		if resp.StatusCode == 403 {
			return nil, fmt.Errorf("status=403 (skipped)")
		}
		return nil, fmt.Errorf("status=%d body=%s", resp.StatusCode, string(b))
	}
	return io.ReadAll(io.LimitReader(resp.Body, 8<<20))
}

func getenv(k, def string) string {
	v := strings.TrimSpace(os.Getenv(k))
	if v == "" {
		return def
	}
	return v
}

func hostname() string {
	h, _ := os.Hostname()
	if strings.TrimSpace(h) == "" {
		return "worker"
	}
	return h
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
