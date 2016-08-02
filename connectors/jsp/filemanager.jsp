<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" trimDirectiveWhitespaces="true"%>
<%@ page language="java" import="java.util.*"%>
<%@ page import="com.nartex.*"%>
<%@ page import="org.json.JSONObject"%>
<%@ page import="java.io.*"%>
<%@include file="auth.jsp"%>
<%
/*
 *  connector filemanager.jsp
 *
 *  @license  MIT License
 *  @author   Dick Toussaint <d.tricky@gmail.com>
 *  @copyright  Authors
 *
 *  CHANGES: 
 *  - check strictServletCompliance
 */ 
  FileManager fm = new FileManager(getServletContext(), request);
 
  boolean strictServletCompliance = false; // default value is ISO-8859-1.

  JSONObject responseData = null;

  String mode = "";
    boolean putTextarea = false;
  if(!auth(request)) {
    fm.error(fm.lang("AUTHORIZATION_REQUIRED"));
  }
  else { 
    if(request.getMethod().equals("GET")) {
      if(request.getParameter("mode") != null && request.getParameter("mode") != "") {
        mode = request.getParameter("mode");
        // cft. http://wiki.apache.org/tomcat/FAQ/CharacterEncoding#Q2
        String [] queryParams = null;
        Map<String,String> qpm = new HashMap<String,String>();
        if (strictServletCompliance) {
          queryParams  = java.net.URLDecoder.decode(request.getQueryString(), "UTF-8").split("&");
          for (int i = 0; i < queryParams.length; i++) {
            String[] qp = queryParams[i].split("=");
            if (qp.length >1) {
              qpm.put(qp[0], qp[1]);
            } else {
              qpm.put(qp[0], "");
            }
          }
        }
        if (mode.equals("getinfo")){
          if(fm.setGetVar("path", (strictServletCompliance)? qpm.get("path"): request.getParameter("path"))) {
            responseData = fm.getInfo();
          }
        }
        else if (mode.equals("getfolder")){
          if(fm.setGetVar("path",  (strictServletCompliance)? qpm.get("path"):request.getParameter("path"))) {
            responseData = fm.getFolder();
          }
        }
        else if (mode.equals("rename")){
          if(fm.setGetVar("old",  (strictServletCompliance)? qpm.get("old"):request.getParameter("old")) && 
              fm.setGetVar("new",  (strictServletCompliance)? qpm.get("new"):request.getParameter("new"))) {
            responseData = fm.rename();
          }
        }
        else if (mode.equals("delete")){
          if(fm.setGetVar("path",  (strictServletCompliance)? qpm.get("path"):request.getParameter("path"))) {
            responseData = fm.delete();
          }
        }
        else if (mode.equals("addfolder")){
          if(fm.setGetVar("path",  (strictServletCompliance)? qpm.get("path"):request.getParameter("path")) && 
              fm.setGetVar("name",  (strictServletCompliance)? qpm.get("name"):request.getParameter("name"))) {
            responseData = fm.addFolder();
          }
        }
        else if (mode.equals("download")){
          if(fm.setGetVar("path",  (strictServletCompliance)? qpm.get("path"):request.getParameter("path"))) {
            fm.download(response);
          }
        }
        else if (mode.equals("preview")){
          if(fm.setGetVar("path",  (strictServletCompliance)? qpm.get("path"):request.getParameter("path"))) {
            fm.preview(response);
          }
        } else if (mode.equals("move")){
            if(fm.setGetVar("old",  (strictServletCompliance)? qpm.get("old"):request.getParameter("old")) && 
                    fm.setGetVar("new",  (strictServletCompliance)? qpm.get("new"):request.getParameter("new")) &&
                    fm.setGetVar("root",  (strictServletCompliance)? qpm.get("root"):request.getParameter("root"))
                    ) {
                responseData = fm.moveItem();
                }
                }
        else {
          fm.error(fm.lang("MODE_ERROR"));
        }
      }
    }
    else if(request.getMethod().equals("POST")){
      mode = "upload";
      responseData = fm.add();
      putTextarea = true;
    }
  }
  if (responseData == null){
    responseData = fm.getError();
  }
  if (responseData != null){
      PrintWriter pw = response.getWriter();
      String responseStr = responseData.toString();
      if (putTextarea)
        responseStr = "<textarea>" + responseStr + "</textarea>";
      //fm.log("d:\\logs\\logfilej.txt", "mode:" + mode + ",response:" + responseStr);
      pw.print(responseStr);
      pw.close();
  }
  %>  
