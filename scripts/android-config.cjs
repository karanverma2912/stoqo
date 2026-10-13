const fs=require('fs');const path=require('path');const settings=require('../mobile/production.json');
if(!settings.api_url||!settings.web_url)throw new Error('Set production origins in mobile/production.json before building a release.');
for(const value of [settings.api_url,settings.web_url]){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Release origins must be plain HTTPS origins.');}
const vars={EXPO_PUBLIC_API_URL:settings.api_url,EXPO_PUBLIC_WEB_URL:settings.web_url,ANDROID_VERSION_CODE:String(100+Number(process.env.ANDROID_VERSION_CODE??3))};
if(process.env.EXPO_PUBLIC_EAS_PROJECT_ID)vars.EXPO_PUBLIC_EAS_PROJECT_ID=process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
if(process.env.GOOGLE_SERVICES_JSON_BASE64){const file=path.resolve('mobile/google-services.json');fs.writeFileSync(file,Buffer.from(process.env.GOOGLE_SERVICES_JSON_BASE64,'base64'));vars.GOOGLE_SERVICES_JSON=file;}
fs.appendFileSync(process.env.GITHUB_ENV,Object.entries(vars).map(([k,v])=>`${k}=${v}\n`).join(''));
