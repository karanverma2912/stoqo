import {apiOrigin} from "@/lib/api-origin";
export async function GET(){
 try {const response=await fetch(`${apiOrigin()}/api/v1/releases/android_metadata`,{next:{revalidate:3600}});if(!response.ok)return Response.json([]);const metadata=await response.json();if(!/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(metadata.sha256))return Response.json([]);return Response.json([{relation:["delegate_permission/common.handle_all_urls"],target:{namespace:"android_app",package_name:"com.stoqo.app",sha256_cert_fingerprints:[metadata.sha256]}}]);}catch{return Response.json([]);}
}
