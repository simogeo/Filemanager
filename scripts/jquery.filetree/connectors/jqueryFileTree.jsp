<%@ page import="java.io.File,java.io.FilenameFilter,java.util.Arrays"%>
<%@ page import="com.nartex.*"%>
<%@ page import="java.net.URLDecoder"%>
<%@include file="../../../connectors/jsp/auth.jsp"%>
<% 
/**
  * jQuery File Tree JSP Connector
  * Version 1.1
  * Copyright 2008 Joshua Gould
  * 21 April 2008
  * History:
  *		1.0: Initial version 
  *		1.1: Dick Toussaint: 
	  		filemanager included to retrieve document root (file manager uses relative paths) and to add the option to 
  *			exclude folders and files.
  */
	if (auth()){

		FileManager fm = new FileManager(getServletContext(), request);

		String dir = request.getParameter("dir");
	    if (dir == null) {
	    	return;
	    }
		
		String documentRoot = fm.getDocumentRoot();
		
		if (dir.charAt(dir.length()-1) != '/') {
		    dir += "/";
		}
		dir = URLDecoder.decode(dir, "UTF-8");
	
		if (new File(documentRoot + dir).exists()) {
			String[] files = new File(documentRoot + dir).list(new FilenameFilter() {
			    public boolean accept(File dir, String name) {
					return name.charAt(0) != '.';
			    }
			});
			Arrays.sort(files, String.CASE_INSENSITIVE_ORDER);
			out.print("<ul class=\"jqueryFileTree\" style=\"display: none;\">");
			// All dirs
			for (String file : files) {
			    if (new File(documentRoot + dir, file).isDirectory() && !fm.contains(fm.getConfigString("unallowed_dirs"), file)) {
					out.print("<li class=\"directory collapsed\"><a href=\"#\" rel=\"" + dir + file + "/\">"
						+ file + "</a></li>");
			    }
			}
			// All files
			for (String file : files) {
			    if (!new File(documentRoot + dir, file).isDirectory() && !fm.contains(fm.getConfigString("unallowed_files"), file)) {
					int dotIndex = file.lastIndexOf('.');
					String ext = dotIndex > 0 ? file.substring(dotIndex + 1) : "";
					out.print("<li class=\"file ext_" + ext + "\"><a href=\"#\" rel=\"" + dir + file + "\">"
						+ file + "</a></li>");
			    	}
			}
			out.print("</ul>");
		}
    }
%>