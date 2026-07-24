package com.pinverse.nb;

import android.content.Intent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 前端与飞书授权 WebView 之间的桥。
 *
 * JS 侧：Capacitor.Plugins.FeishuAuth.openAuth({ url }) -> { completed, ok, reason }
 * 授权凭证全程只在后端流转，这里只回传三个状态字段。
 */
@CapacitorPlugin(name = "FeishuAuth")
public class FeishuAuthPlugin extends Plugin {

    @PluginMethod
    public void openAuth(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("缺少授权地址");
            return;
        }

        Intent intent = new Intent(getContext(), FeishuAuthActivity.class);
        intent.putExtra(FeishuAuthActivity.EXTRA_URL, url);
        startActivityForResult(call, intent, "handleAuthResult");
    }

    @ActivityCallback
    private void handleAuthResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        Intent data = result.getData();
        boolean completed = data != null && data.getBooleanExtra(FeishuAuthActivity.EXTRA_COMPLETED, false);

        JSObject ret = new JSObject();
        ret.put("completed", completed);
        ret.put("ok", completed && data.getBooleanExtra(FeishuAuthActivity.EXTRA_OK, false));
        ret.put("reason", data != null ? data.getStringExtra(FeishuAuthActivity.EXTRA_REASON) : null);
        call.resolve(ret);
    }
}
