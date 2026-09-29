package com.stoqo.app;
import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.*;
import android.view.ViewGroup;
import android.view.WindowInsets;
import java.util.Arrays;

/** Online Android client. No JavaScript bridge or credentials in native storage. */
public class MainActivity extends Activity {
 private WebView web;
 private String origin;
 private PermissionRequest cameraRequest;
 private ValueCallback<Uri[]> fileCallback;
 @Override public void onCreate(Bundle b){super.onCreate(b);String saved=getPreferences(0).getString("origin","");if(saved.isEmpty())setup();else launch(saved);}
 private void setup(){
  LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(32,72,32,32);
  TextView title=new TextView(this);title.setText("stoqo.\nConnect your store");title.setTextSize(30);layout.addView(title);
  TextView description=new TextView(this);description.setText("Enter the live Stoqo website address supplied by your store owner. Use the same address on every employee's phone.");layout.addView(description);
  EditText input=new EditText(this);input.setHint("https://your-store.onrender.com");input.setInputType(17);layout.addView(input);
  Button button=new Button(this);button.setText("Connect store");layout.addView(button);button.setOnClickListener(v->{
    try{Uri u=Uri.parse(input.getText().toString().trim());if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||u.getPort()!=-1||u.getQuery()!=null||u.getFragment()!=null)throw new IllegalArgumentException();String next="https://"+u.getHost();new AlertDialog.Builder(this).setTitle("Connect to this store?").setMessage(next+"\nOnly continue if this is your store's Stoqo website. Your login will be sent to this website.").setPositiveButton("Connect",(d,w)->{getPreferences(0).edit().putString("origin",next).apply();launch(next);}).setNegativeButton("Cancel",null).show();}catch(Exception e){input.setError("Enter a valid HTTPS website address");}
  });setContentView(layout);
 }
 private boolean trusted(Uri uri){return uri!=null&&origin.equals(uri.getScheme()+"://"+uri.getAuthority());}
 private void launch(String address){
  origin=address;LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
  root.setOnApplyWindowInsetsListener((v,i)->{if(android.os.Build.VERSION.SDK_INT>=30){android.graphics.Insets in=i.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(in.left,in.top,in.right,in.bottom);}else{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());}return i;});
  LinearLayout bar=new LinearLayout(this);Button reload=new Button(this);reload.setText("Reload");reload.setOnClickListener(v->web.reload());bar.addView(reload);Button browser=new Button(this);browser.setText("Browser");browser.setOnClickListener(v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(origin+"/app"))));bar.addView(browser);Button change=new Button(this);change.setText("Change store");change.setOnClickListener(v->new AlertDialog.Builder(this).setMessage("Sign out on this phone and connect another store?").setPositiveButton("Continue",(d,w)->{CookieManager.getInstance().removeAllCookies(null);WebStorage.getInstance().deleteAllData();web.destroy();web=null;getPreferences(0).edit().clear().apply();setup();}).setNegativeButton("Cancel",null).show());bar.addView(change);root.addView(bar);
  web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(true);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);web.getSettings().setMediaPlaybackRequiresUserGesture(false);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if(trusted(u))return false;if(r.isForMainFrame()&&"https".equals(u.getScheme()))startActivity(new Intent(Intent.ACTION_VIEW,u));return true;}
   @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())Toast.makeText(MainActivity.this,"Could not reach your store. Check your connection and tap Reload.",Toast.LENGTH_LONG).show();}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->{if(!trusted(request.getOrigin())||!Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)){request.deny();return;}if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else{if(cameraRequest!=null)cameraRequest.deny();cameraRequest=request;requestPermissions(new String[]{Manifest.permission.CAMERA},10);}});}
   @Override public void onPermissionRequestCanceled(PermissionRequest r){if(cameraRequest==r)cameraRequest=null;}
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;try{startActivityForResult(params.createIntent(),11);}catch(Exception e){fileCallback.onReceiveValue(null);fileCallback=null;}return true;}
  });
  web.setDownloadListener((url,ua,disposition,mime,len)->new AlertDialog.Builder(this).setMessage("For CSV exports, open the store in your browser and choose Export there.").setPositiveButton("Open browser",(d,w)->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(origin+"/app/inventory")))).setNegativeButton("Cancel",null).show());
  root.addView(web,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,0,1));setContentView(root);web.loadUrl(origin+"/app");
 }
 @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==10&&cameraRequest!=null){if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED&&trusted(cameraRequest.getOrigin()))cameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else cameraRequest.deny();cameraRequest=null;}}
 @Override protected void onActivityResult(int code,int result,Intent data){super.onActivityResult(code,result,data);if(code==11&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileCallback=null;}}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(cameraRequest!=null)cameraRequest.deny();if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null)web.destroy();super.onDestroy();}
}
