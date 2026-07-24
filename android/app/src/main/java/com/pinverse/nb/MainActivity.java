package com.pinverse.nb;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 应用内自定义插件需在 super.onCreate 之前注册
        registerPlugin(FeishuAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
