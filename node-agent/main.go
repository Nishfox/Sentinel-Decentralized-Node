// Sentinel Community Edition | Copyright (c) 2026 Nishfox
package main

import (
 "bufio"
 "context"
 "encoding/json"
 "flag"
 "fmt"
 "io"
 "net"
 "net/http"
 "net/http/httputil"
 "net/url"
 "os"
 "strings"
 "sync"
 "time"

 "tailscale.com/tsnet"
)

var outputMu sync.Mutex
func emit(v any) { outputMu.Lock(); defer outputMu.Unlock(); _ = json.NewEncoder(os.Stdout).Encode(v) }
type command struct { ID string `json:"id"`; Action string `json:"action"`; Target string `json:"target"`; Secret string `json:"secret"` }
func main() {
 hostname:=flag.String("hostname","","Node name"); dir:=flag.String("state-dir","","Private persistent identity directory");check:=flag.Bool("check",false,"Check binary without joining a network");flag.Parse()
 if *check { fmt.Println("sentinel-node-agent ready");return }
 if *hostname==""||*dir=="" { fmt.Fprintln(os.Stderr,"hostname and state-dir required");os.Exit(1) }
 ctx,cancel:=context.WithCancel(context.Background());defer cancel()
 s:=&tsnet.Server{Hostname:*hostname,Dir:*dir,Ephemeral:false,Logf:func(string,...any){},UserLogf:func(format string,args ...any){emit(map[string]any{"type":"log","message":fmt.Sprintf(format,args...)})}}
 if err:=s.Start();err!=nil { emit(map[string]any{"type":"fatal","error":err.Error()});return };defer s.Close()
 lc,err:=s.LocalClient();if err!=nil {emit(map[string]any{"type":"fatal","error":err.Error()});return}
 go func(){_,err:=s.Up(ctx);if err!=nil&&ctx.Err()==nil{emit(map[string]any{"type":"log","message":err.Error()})}}()
 var listener net.Listener;var publicServer *http.Server;var publicMu sync.Mutex;public:=false
 stopPublic:=func(){publicMu.Lock();defer publicMu.Unlock();if publicServer!=nil{_ = publicServer.Close();publicServer=nil};if listener!=nil{_ = listener.Close();listener=nil};public=false}
 defer stopPublic()
 go func(){previous:="";lastEmit:=time.Time{};for {select{case <-ctx.Done():return;case <-time.After(time.Second):}
  q,c:=context.WithTimeout(ctx,3*time.Second);st,e:=lc.StatusWithoutPeers(q);c();if e!=nil{continue};dns:="";nodeID:="";if st.Self!=nil{dns=strings.TrimSuffix(st.Self.DNSName,".");nodeID=string(st.Self.ID)};publicMu.Lock();isPublic:=public;publicMu.Unlock()
  data:=map[string]any{"type":"state","connected":st.BackendState=="Running","state":st.BackendState,"loginUrl":st.AuthURL,"nodeId":nodeID,"public":isPublic};if dns!=""{data["url"]="https://"+dns;data["nodeName"]=strings.Split(dns,".")[0]};encoded,_:=json.Marshal(data);if string(encoded)!=previous||time.Since(lastEmit)>5*time.Second{emit(data);previous=string(encoded);lastEmit=time.Now()}
 }}()
 scanner:=bufio.NewScanner(os.Stdin)
 for scanner.Scan(){var cmd command;if json.Unmarshal(scanner.Bytes(),&cmd)!=nil{continue};result:=map[string]any{"type":"result","id":cmd.ID,"ok":true}
  switch cmd.Action {
  case "publish":
   target,e:=url.Parse(cmd.Target);if e!=nil||target.Scheme!="http"||target.Hostname()!="127.0.0.1"||target.Port()==""||len(cmd.Secret)<32{result["ok"]=false;result["error"]="Invalid loopback upstream";break}
   q,c:=context.WithTimeout(ctx,5*time.Second);st,e:=lc.StatusWithoutPeers(q);c();if e!=nil||st.BackendState!="Running"{result["ok"]=false;result["error"]="Completa prima il login del nodo";break}
   stopPublic();ln,e:=s.ListenFunnel("tcp",":443");if e!=nil{result["ok"]=false;result["error"]=e.Error();break}
   proxy:=httputil.NewSingleHostReverseProxy(target);proxy.ErrorHandler=func(w http.ResponseWriter,r *http.Request,err error){http.Error(w,"Server locale non disponibile",502)}
   secret:=cmd.Secret
   handler:=http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){r.Header.Del("X-Sentinel-Probe");r.Header.Del("X-Sentinel-Source");r.Header.Del("X-Sentinel-Source-Key");source,_,e:=net.SplitHostPort(r.RemoteAddr);if e!=nil{source=r.RemoteAddr};r.Header.Set("X-Sentinel-Source",source);r.Header.Set("X-Sentinel-Source-Key",secret);proxy.ServeHTTP(w,r)})
   server:=&http.Server{Handler:handler,ReadHeaderTimeout:10*time.Second,ReadTimeout:15*time.Second,WriteTimeout:60*time.Second,IdleTimeout:60*time.Second,MaxHeaderBytes:16384};publicMu.Lock();listener=ln;publicServer=server;public=true;publicMu.Unlock();go func(){_ = server.Serve(ln)}()
   result["url"]="https://"+strings.TrimSuffix(st.Self.DNSName,".")
  case "unpublish":stopPublic()
  case "logout":stopPublic();q,c:=context.WithTimeout(ctx,10*time.Second);e:=lc.Logout(q);c();if e!=nil{result["ok"]=false;result["error"]=e.Error()}
  case "stop":emit(result);return
  default:result["ok"]=false;result["error"]="Unknown command"
  };emit(result)
 }
 if err:=scanner.Err();err!=nil&&err!=io.EOF{fmt.Fprintln(os.Stderr,err)}
}
