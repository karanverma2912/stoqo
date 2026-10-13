const fs=require('fs');const path=require('path');const config=require('../mobile/production.json');
async function main(){
  const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience','stoqo-android-build');
  const response=await fetch(url,{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`}});if(!response.ok)throw new Error('GitHub identity request failed');
  const identity=(await response.json()).value;console.log(`::add-mask::${identity}`);
  const result=await fetch(`${config.api_url}/api/v1/releases/android_credentials`,{method:'POST',headers:{Authorization:`Bearer ${identity}`},signal:AbortSignal.timeout(120000)});if(!result.ok)throw new Error(`Signing service rejected this release (${result.status})`);
  const credentials=await result.json();for(const value of [credentials.keystore,credentials.password])console.log(`::add-mask::${value}`);
  if(credentials.store_type!=='PKCS12'||!credentials.password||!credentials.sha256)throw new Error('Invalid signing credentials');
  const keyPath=path.join(process.env.RUNNER_TEMP,'stoqo-release.p12');fs.writeFileSync(keyPath,Buffer.from(credentials.keystore,'base64'),{mode:0o600});
  fs.appendFileSync(process.env.GITHUB_ENV,`STOQO_RELEASE_KEYSTORE=${keyPath}\nSTOQO_RELEASE_STORE_PASSWORD=${credentials.password}\nSTOQO_RELEASE_KEY_PASSWORD=${credentials.password}\nSTOQO_RELEASE_ALIAS=${credentials.alias}\nSTOQO_RELEASE_CERT_SHA256=${credentials.sha256}\n`);
  const gradlePath='mobile/android/app/build.gradle';let gradle=fs.readFileSync(gradlePath,'utf8');
  if(!/signingConfigs\s*\{/.test(gradle)||!/buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig signingConfigs.debug/.test(gradle))throw new Error('Review the generated Android signing configuration before release.');
  gradle=gradle.replace(/signingConfigs\s*\{/,`signingConfigs {\n        release {\n            storeFile file(System.getenv('STOQO_RELEASE_KEYSTORE'))\n            storeType 'PKCS12'\n            storePassword System.getenv('STOQO_RELEASE_STORE_PASSWORD')\n            keyAlias System.getenv('STOQO_RELEASE_ALIAS')\n            keyPassword System.getenv('STOQO_RELEASE_KEY_PASSWORD')\n        }`);
  gradle=gradle.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs.debug/,'$1signingConfig signingConfigs.release');fs.writeFileSync(gradlePath,gradle);
}
main().catch(error=>{console.error(error.message);process.exit(1);});
