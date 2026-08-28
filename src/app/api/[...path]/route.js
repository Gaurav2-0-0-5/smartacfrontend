import { NextResponse } from "next/server";

export async function handleProxy(request, { params }) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path;
    const pathString = Array.isArray(path) ? path.join("/") : path || "";
    
    // Server-only environment variable process.env.Config (defaults to Render backend)
    const backendBase = process.env.Config || "https://smartacbackend.onrender.com";
    
    // Prevent self-referencing proxy loop if Config accidentally matches Next.js origin
    const incomingUrl = new URL(request.url);
    if (backendBase.startsWith(incomingUrl.origin)) {
      console.error("Proxy error: Config matches frontend origin, causing infinite loop:", backendBase);
      return NextResponse.json(
        { error: "Proxy loop detected. Config must point to backend server URL, not frontend URL." },
        { status: 500 }
      );
    }

    const targetUrl = new URL(`/api/${pathString}`, backendBase);
    targetUrl.search = incomingUrl.search;

    // Clone headers, omitting host & connection
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("connection");

    // Retrieve request body if present
    const method = request.method.toUpperCase();
    let body = undefined;
    if (!["GET", "HEAD"].includes(method)) {
      body = await request.blob();
    }

    const backendResponse = await fetch(targetUrl.toString(), {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const responseData = await backendResponse.arrayBuffer();

    // Prepare response headers safely omitting hop-by-hop headers
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!["content-encoding", "content-length", "transfer-encoding"].includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(responseData, {
      status: backendResponse.status,
      statusText: backendResponse.statusText || "OK",
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("API proxy handler error:", err);
    return NextResponse.json(
      { error: "Internal Server Proxy Error", details: err.message },
      { status: 500 }
    );
  }
}

export {
  handleProxy as GET,
  handleProxy as POST,
  handleProxy as PUT,
  handleProxy as DELETE,
  handleProxy as PATCH,
  handleProxy as OPTIONS
};
