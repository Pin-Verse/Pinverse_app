package com.pinverse.nb;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

/**
 * 飞书 OAuth 授权页容器。
 *
 * 用独立 WebView 加载后端下发的授权地址，并拦截所有以 https://pin.verse/bind-success 开头的跳转：
 * 该域名不可达，绝不能放行真实网络请求，拦截到即解析 ok / reason 并关闭本页。
 *
 * 结果通过 setResult 回传给 FeishuAuthPlugin：
 *   completed = 是否走到了 bind-success（用户中途返回则为 false）
 *   ok / reason = bind-success 上的查询参数，仅用于决定提示文案，真实绑定状态由前端另行查询接口确认。
 */
public class FeishuAuthActivity extends AppCompatActivity {

    public static final String EXTRA_URL = "url";
    public static final String EXTRA_COMPLETED = "completed";
    public static final String EXTRA_OK = "ok";
    public static final String EXTRA_REASON = "reason";

    private static final String BIND_SUCCESS_PREFIX = "https://pin.verse/bind-success";

    private WebView webView;
    private boolean finished = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_feishu_auth);

        findViewById(R.id.feishuAuthClose).setOnClickListener(v -> finishWithCancel());

        webView = findViewById(R.id.feishuAuthWebView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl().toString());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(url);
            }
        });

        // 系统返回键：WebView 内可回退时先回退，否则视为用户主动取消授权
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finishWithCancel();
                }
            }
        });

        String url = getIntent().getStringExtra(EXTRA_URL);
        if (url == null || url.isEmpty()) {
            finishWithCancel();
            return;
        }
        webView.loadUrl(url);
    }

    /** 返回 true 表示拦截，WebView 不会真正发起这次加载。 */
    private boolean handleUrl(String url) {
        if (url == null || !url.startsWith(BIND_SUCCESS_PREFIX)) return false;

        Uri uri = Uri.parse(url);
        Intent data = new Intent();
        data.putExtra(EXTRA_COMPLETED, true);
        data.putExtra(EXTRA_OK, "true".equalsIgnoreCase(uri.getQueryParameter("ok")));
        data.putExtra(EXTRA_REASON, uri.getQueryParameter("reason"));
        finishWith(data);
        return true;
    }

    private void finishWithCancel() {
        Intent data = new Intent();
        data.putExtra(EXTRA_COMPLETED, false);
        finishWith(data);
    }

    private void finishWith(Intent data) {
        if (finished) return;
        finished = true;
        setResult(RESULT_OK, data);
        finish();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.setWebViewClient(new WebViewClient());
            webView.stopLoading();
            ((View) webView.getParent()).post(webView::destroy);
        }
        super.onDestroy();
    }
}
