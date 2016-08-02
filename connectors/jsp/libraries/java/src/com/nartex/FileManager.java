/*
 *	Filemanager.java utility class for for filemanager.jsp
 *
 *	@license	MIT License
 *	@author		Dick Toussaint <d.tricky@gmail.com>
 *	@copyright	Authors
 */
package com.nartex;

import java.awt.Dimension;
import java.awt.Image;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.swing.ImageIcon;

import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileItemFactory;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;

import org.json.JSONException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 
 * 
 * 
 * CHANGES
 * - using {@link Path} instead of {@link File} methods
 * - added mode replace
 * 
 * @author gkallidis
 *
 */
public class FileManager {

	protected static Properties config = null;
	protected static JSONObject language = null;
	protected Map<String, String> get = new HashMap<String, String>();
	protected Map<String, String> properties = new HashMap<String, String>();
	protected Map item = new HashMap();
	protected Map<String, String> params = new HashMap<String, String>();
	protected Path documentRoot;
	
	protected Path fileManagerRoot = null;
	protected String referer = "";
	protected Logger log = LoggerFactory.getLogger("filemanager");

	protected JSONObject error = null;

	SimpleDateFormat dateFormat;
	List files = null;

	/**
	 * 
	 * @param servletContext
	 * @param request
	 * @throws IOException 
	 */
	
	public FileManager(ServletContext servletContext, HttpServletRequest request) throws IOException {

        String contextPath = request.getContextPath();
        
        Path localPath = Paths.get(servletContext.getRealPath("/")); 
        Path docRoot4FileManager = localPath.toRealPath(LinkOption.NOFOLLOW_LINKS);
        		
        this.referer = request.getHeader("referer");
        this.fileManagerRoot =  docRoot4FileManager.
        			resolve(referer.substring(referer.indexOf(contextPath) + 1 + contextPath.length(), referer.indexOf("index.html")));
        log.debug("fileManagerRoot:"+ fileManagerRoot.toRealPath(LinkOption.NOFOLLOW_LINKS));
	    
		// get uploaded file list
		FileItemFactory factory = new DiskFileItemFactory();
		ServletFileUpload upload = new ServletFileUpload(factory);
		if (ServletFileUpload.isMultipartContent(request))
			try {
				files = upload.parseRequest(request);
			} catch (Exception e) { // no error handling}
			}

		this.properties.put("Date Created", null);
		this.properties.put("Date Modified", null);
		this.properties.put("Height", null);
		this.properties.put("Width", null);
		this.properties.put("Size", null);

		// load config file
		loadConfig();

		if (config.getProperty("doc_root") != null) {
			// contextpath starts with slash
		    this.documentRoot = Paths.get(config.getProperty("doc_root") +  request.getContextPath()); 
		} else {
			if (this.documentRoot == null ) {
				this.documentRoot =  docRoot4FileManager.toRealPath(LinkOption.NOFOLLOW_LINKS);
			}
		}

	    log.info("final documentRoot:"+ this.documentRoot);
		dateFormat = new SimpleDateFormat(config.getProperty("date"));

		this.setParams();

		loadLanguageFile();
	}
	
    
    public JSONObject error(String msg, Throwable ex) {
		JSONObject errorInfo = new JSONObject();
		try {
			errorInfo.put("Error", msg);
			errorInfo.put("Code", "-1");
			errorInfo.put("Properties", this.properties);
		} catch (Exception e) {
			this.error("JSONObject error");
		}
		if (ex != null) {
			log.error( msg, ex ); 
		} else {
			log.error( msg); 
		}
		this.error = errorInfo;
		return error;
	}

	public JSONObject error(String msg) {
		return error(msg, null);
	}

	public JSONObject getError() {
		return error;
	}

	public String lang(String key) {
		String text = "";
		try {
			text = language.getString(key);
		} catch (Exception e) {
		}
		if (text == null || text.equals("") )
			text = "Language string error on " + key;
		return text;
	}

	public boolean setGetVar(String var, String value) {
		boolean retval = false;
		if (value == null || value == "") {
			this.error(sprintf(lang("INVALID_VAR"), var));
		} else {
			// clean first slash, as Path does not resolve it relative otherwise 
			if (var.equals("path") && value.startsWith("/")) {
				 value = value.replaceFirst("/", "");
			}
			this.get.put(var, sanitize(value));
			retval = true;
		}
		return retval;
	}

	public JSONObject getInfo() throws JSONException {
		this.item = new HashMap();
		this.item.put("properties", this.properties);
		this.getFileInfo("");
		JSONObject array = new JSONObject();

		try {
			array.put("Path", this.get.get("path"));
			array.put("Filename", this.item.get("filename"));
			array.put("File Type", this.item.get("filetype"));
			array.put("Preview", this.item.get("preview"));
			array.put("Properties", this.item.get("properties"));
			array.put("Error", "");
			array.put("Code", 0);
		} catch (Exception e) {
			this.error("JSONObject error");
		}
		return array;
	}

	public JSONObject getFolder() throws JSONException, IOException {
		JSONObject array = null;
		//uri
		Path root = documentRoot.resolve(this.get.get("path"));
		log.debug("path absolute:" + root.toAbsolutePath());
		Path docDir = documentRoot.resolve(this.get.get("path")).toRealPath(LinkOption.NOFOLLOW_LINKS);
		File dir = docDir.toFile(); //new File(documentRoot + this.get.get("path"));

		File file = null;
		if (!dir.isDirectory()) {
			this.error(sprintf(lang("DIRECTORY_NOT_EXIST"), this.get.get("path")));
		} else {
			if (!dir.canRead()) {
				this.error(sprintf(lang("UNABLE_TO_OPEN_DIRECTORY"), this.get.get("path")));
			} else {
				array = new JSONObject();
				String[] files = dir.list();
				JSONObject data = null;
				JSONObject props = null;
				for (int i = 0; i < files.length; i++) {
					data = new JSONObject();
					props = new JSONObject();
					file = docDir.resolve(files[i]).toFile();
							//new File(documentRoot + this.get.get("path") + files[i]);
					if (file.isDirectory() && !contains(config.getProperty("unallowed_dirs"), files[i])) {
						try {
							props.put("Date Created", (String) null);
							props.put("Date Modified", (String) null);
							props.put("Height", (String) null);
							props.put("Width", (String) null);
							props.put("Size", (String) null);
							data.put("Path", this.get.get("path") + files[i] + "/");
							data.put("Filename", files[i]);
							data.put("File Type", "dir");
							data.put("Preview",
									config.getProperty("icons-path") + config.getProperty("icons-directory"));
							data.put("Error", "");
							data.put("Code", 0);
							data.put("Properties", props);

							array.put(this.get.get("path") + files[i] + "/", data);
						} catch (Exception e) {
							this.error("JSONObject error");
						}
					} else if (file.canRead() && (!contains(config.getProperty("unallowed_files"), files[i])) ) {
						//this.item = new HashMap();
						this.item = new HashMap();
						this.item.put("properties", this.properties);
						this.getFileInfo(this.get.get("path") + files[i]);

						//if (this.params.get("type") == null || (this.params.get("type") != null && (!this.params.get("type").equals("Image") || checkImageType()))) {
						if (this.params.get("type") == null || 
								(this.params.get("type") != null && ( (!this.params.get("type").equals("Image") && 
										!this.params.get("type").equals("Flash")) ||
										checkImageType() || checkFlashType() ))) {
							try {
								data.put("Path", this.get.get("path") + files[i]);
								data.put("Filename", this.item.get("filename"));
								data.put("File Type", this.item.get("filetype"));
								data.put("Preview", this.item.get("preview"));
								data.put("Properties", this.item.get("properties"));
								data.put("Error", "");
								data.put("Code", 0);
								log.debug("data now :"+ data.toString());

								array.put(this.get.get("path") + files[i], data);
							} catch (Exception e) {
								this.error("JSONObject error");
							}
						}
					} else {
					    log.warn( "not allowed file or dir:" +files[i] );
					}
				}
			}
		}
		log.debug("array size ready:"+ ((array != null)?array.toString():"") );		
		return array;
	}

	private boolean checkImageType() {
		return this.params
				.get("type").equals("Image")
				&& contains(config.getProperty("images"), (String) this.item.get("filetype"));
	}
	
	private boolean checkFlashType() {
		return this.params
				.get("type").equals("Flash")
				&& contains(config.getProperty("flash"), (String) this.item.get("filetype"));
	}

	public JSONObject rename() {
		if ((this.get.get("old")).endsWith("/")) {
			this.get.put("old", (this.get.get("old")).substring(0, ((this.get.get("old")).length() - 1)));
		}
		boolean error = false;
		JSONObject array = null;
		String tmp[] = (this.get.get("old")).split("/");
		String filename = tmp[tmp.length - 1];
		int pos = this.get.get("old").lastIndexOf("/");
		String path = (this.get.get("old")).substring(0, pos + 1);
		Path fileFrom = null;
		Path fileTo = null;
		try {
			fileFrom = this.documentRoot.resolve(path).resolve(filename);
			fileTo = this.documentRoot.resolve(path).resolve( this.get.get("new"));
			if (fileTo.toFile().exists()) {
				if (fileTo.toFile().isDirectory()) {
					this.error(sprintf(lang("DIRECTORY_ALREADY_EXISTS"), this.get.get("new")));
					error = true;
				} else { // fileTo.isFile
					// Files.isSameFile(fileFrom, fileTo);
					this.error(sprintf(lang("FILE_ALREADY_EXISTS"), this.get.get("new")));
					error = true;
				}
			} else {
				//if (fileFrom.equals(fileTo));
				Files.move(fileFrom, fileTo, StandardCopyOption.REPLACE_EXISTING);
			}
		} catch (Exception e) {
			if (fileFrom.toFile().isDirectory()) {
				this.error(sprintf(lang("ERROR_RENAMING_DIRECTORY"), filename + "#" + this.get.get("new")),e);
			} else {
				this.error(sprintf(lang("ERROR_RENAMING_FILE"), filename + "#" + this.get.get("new")),e);
			}
			error = true;
		}
		if (!error) {
			array = new JSONObject();
			try {
				array.put("Error", "");
				array.put("Code", 0);
				array.put("Old Path", this.get.get("old"));
				array.put("Old Name", filename);
				array.put("New Path", path + this.get.get("new"));
				array.put("New Name", this.get.get("new"));
			} catch (Exception e) {
				this.error("JSONObject error");
			}
		}
		return array;
	}

	public JSONObject delete() {
		JSONObject array = null;
		File file = this.documentRoot .resolve( this.get.get("path")).toFile();
				//new File(this.documentRoot + this.get.get("path"));
		if (file.isDirectory()) {
			array = new JSONObject();
			this.unlinkRecursive(this.documentRoot.resolve( this.get.get("path")).toFile(), true);
			try {
				array.put("Error", "");
				array.put("Code", 0);
				array.put("Path", this.get.get("path"));
			} catch (Exception e) {
				this.error("JSONObject error");
			}
		} else if (file.exists()) {
			array = new JSONObject();
			if (file.delete()) {
				try {
					array.put("Error", "");
					array.put("Code", 0);
					array.put("Path", this.get.get("path"));
				} catch (Exception e) {
					this.error("JSONObject error");
				}
			} else
				this.error(sprintf(lang("ERROR_DELETING FILE"), this.get.get("path")));
			return array;
		} else {
			this.error(lang("INVALID_DIRECTORY_OR_FILE"));
		}
		return array;
	}

	public JSONObject add() {
		JSONObject fileInfo = null;
		Iterator it = this.files.iterator();
		String mode = "";
		String currentPath = "";
		boolean error = false;
		boolean replace = false;
		long size = 0;
		if (!it.hasNext()) {
			this.error(lang("INVALID_FILE_UPLOAD"));
		} else {
			String allowed[] = { ".", "-" };
			String fileName = "";
			FileItem targetItem = null;
			try {
				while (it.hasNext()) {
					FileItem item = (FileItem) it.next();
					if (item.isFormField()) {
						if (item.getFieldName().equals("mode")) {
							mode = item.getString();
							if (!mode.equals("add") && !mode.equals("replace")) {
								this.error(lang("INVALID_FILE_UPLOAD"));
							} 
						} else if (item.getFieldName().equals("currentpath")) {
							currentPath = item.getString();
						} else if (item.getFieldName().equals("newfilepath")){
							currentPath = item.getString();
						}
					} else if ( item.getFieldName().equals("fileR")) {
						replace= true;
						size = item.getSize();
						targetItem =item;
						
					} else if (item.getFieldName().equals("newfile")) {
						fileName = item.getName();
						// strip possible directory (IE)
						int pos = fileName.lastIndexOf(File.separator);
						if (pos > 0) {
							fileName = fileName.substring(pos + 1);
						}
						size = item.getSize();
						targetItem =item;
					}
				}
				if (!error) {
					if (replace) {
						String tmp[] = currentPath.split("/");
						fileName = tmp[tmp.length - 1];
						int pos = fileName.lastIndexOf(File.separator);
						if (pos > 0)
							fileName = fileName.substring(pos + 1);
						if (tmp.length > 1) {
							currentPath = currentPath.replace(fileName, "");
							currentPath = currentPath.replace("//", "/");
						}
					} else {
						if (!isImage(fileName)
								&& (config.getProperty("upload-imagesonly") != null
										&& config.getProperty("upload-imagesonly").equals("true") || this.params
										.get("type") != null && this.params.get("type").equals("Image"))) {
							this.error(lang("UPLOAD_IMAGES_ONLY"));
							error =true;
						}	
						LinkedHashMap<String, String> strList = new LinkedHashMap<String, String>();
						strList.put("fileName", fileName);
						fileName = cleanString(strList, allowed).get("fileName");
					}
					long maxSize = 0;
					if (config.getProperty("upload-size") != null) {
						maxSize = Integer.parseInt(config.getProperty("upload-size"));
						if (maxSize != 0 && size > (maxSize * 1024 * 1024)) {
							this.error(sprintf(lang("UPLOAD_FILES_SMALLER_THAN"), maxSize + "Mb"));
							error = true;
						}
					}
					if (!error) {
						fileInfo = new JSONObject();

						if (config.getProperty("upload-overwrite").equals("false")) {
							fileName = this.checkFilename(this.documentRoot.resolve(currentPath).toString(), fileName, 0);
						}
						if (mode.equals("replace")) {
							File saveTo = this.documentRoot.resolve(currentPath).resolve(fileName).toFile();
							targetItem.write(saveTo);
							log.info("saved "+ saveTo);
						} else {
							currentPath = currentPath.replace("/", "/").replaceFirst("^/", "");// relative
							fileName = fileName.replace("//", "/").replaceFirst("^/", "");// relative
							File saveTo = this.documentRoot.resolve(currentPath).resolve(fileName).toFile();
							targetItem.write(saveTo);
							log.info("saved "+ saveTo);
						}
						fileInfo.put("Path", currentPath);
						fileInfo.put("Name", fileName);
						fileInfo.put("Error", "");
						fileInfo.put("Code", 0);
					}
				}
			} catch (Exception e) {
				this.error(lang("INVALID_FILE_UPLOAD"),e);
			}
		}
		return fileInfo;

	}

	public JSONObject addFolder() {
		JSONObject array = null;
		String allowed[] = { "-", " " };
		LinkedHashMap<String, String> strList = new LinkedHashMap<String, String>();
		strList.put("fileName", this.get.get("name"));
		String filename = cleanString(strList, allowed).get("fileName");
		if (filename.length() == 0) // the name existed of only special
									// characters
			this.error(sprintf(lang("UNABLE_TO_CREATE_DIRECTORY"), this.get.get("name")));
		else {
			File file = this.documentRoot.resolve(this.get.get("path")).resolve(filename).toFile();
			if (file.isDirectory()) {
				this.error(sprintf(lang("DIRECTORY_ALREADY_EXISTS"), filename));
			} else if (!file.mkdir()) {
				this.error(sprintf(lang("UNABLE_TO_CREATE_DIRECTORY"), filename));
			} else {
				try {
					array = new JSONObject();
					array.put("Parent", this.get.get("path"));
					array.put("Name", filename);
					array.put("Error", "");
					array.put("Code", 0);
				} catch (Exception e) {
					this.error("JSONObject error");
				}
			}
		}
		return array;
	}
	

   public JSONObject moveItem() {
       if ((this.get.get("old")).endsWith("/")) {
           this.get.put("old", (this.get.get("old")).substring(0, ((this.get.get("old")).length() - 1)));
       }
       boolean error = false;
       JSONObject array = null;
       String tmp[] = (this.get.get("old")).split("/");
       String filename = tmp[tmp.length - 1];
       int pos = this.get.get("old").lastIndexOf("/");
       String path = (this.get.get("old")).substring(0, pos + 1);
       String root =  this.get.get("root"); // slash at beginning and end
       String folder =  this.get.get("new");
       if (folder.trim().startsWith( "/")) {
           folder = folder.trim().replaceFirst( "/", "" );
       } 
       if (!folder.equals( "" )) {
           folder = (folder.endsWith( "/" ))? folder:folder+"/";
       }
       File fileFrom = null;
       File fileTo = null;
       log.info( "moving file from "+ this.documentRoot.resolve(this.get.get("old"))
                       +" to " + this.documentRoot.resolve(root).resolve(folder).resolve(filename));
       try {
           fileFrom = this.documentRoot.resolve(this.get.get("old")).toFile();
           fileTo = this.documentRoot.resolve(root).resolve(folder).resolve(filename).toFile();
           if (fileTo.exists()) {
               if (fileTo.isDirectory()) {
                   this.error(sprintf(lang("DIRECTORY_ALREADY_EXISTS"),this.documentRoot.resolve(root).resolve(folder).resolve(filename).toString()));
                   error = true;
               } else { // fileTo.isFile
                   this.error(sprintf(lang("FILE_ALREADY_EXISTS"), folder + filename ));
                   error = true;
               }
           } else if (!fileFrom.renameTo(fileTo)) {
               this.error(sprintf(lang("ERROR_RENAMING_DIRECTORY"), filename + "#" + this.get.get("new")));
               error = true;
           }
       } catch (Exception e) {
           if (fileFrom.isDirectory()) {
               this.error(sprintf(lang("ERROR_RENAMING_DIRECTORY"), filename + "#" + this.get.get("new")));
           } else {
               this.error(sprintf(lang("ERROR_RENAMING_FILE"), filename + "#" + this.get.get("new")));
           }
           error = true;
       }
       if (!error) {
           array = new JSONObject();
           try {
               array.put("Error", "");
               array.put("Code", 0);
               array.put("Old Path", path);
               array.put("Old Name", filename);
               array.put("New Path", root + folder);
               array.put("New Name", filename);
           } catch (Exception e) {
               this.error("JSONObject error");
           }
       } 
       return array;
    }

	public void download(HttpServletResponse resp) {
		File file = this.documentRoot.resolve(this.get.get("path")).toFile();
		if (this.get.get("path") != null && file.exists()) {
			resp.setHeader("Content-type", "application/force-download");
			resp.setHeader("Content-Disposition", "inline;filename=\"" + documentRoot.resolve(this.get.get("path")).toString() + "\"");
			resp.setHeader("Content-Transfer-Encoding", "Binary");
			resp.setHeader("Content-length", "" + file.length());
			resp.setHeader("Content-Type", "application/octet-stream");
			resp.setHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");
			readFile(resp, file);
		} else {
			this.error(sprintf(lang("FILE_DOES_NOT_EXIST"), this.get.get("path")));
		}
	}

	private void readFile(HttpServletResponse resp, File file) {
		OutputStream os = null;
		FileInputStream fis = null;
		try {
			os = resp.getOutputStream();
			fis = new FileInputStream(file);
			byte fileContent[] = new byte[(int) file.length()];
			fis.read(fileContent);
			os.write(fileContent);
		} catch (Exception e) {
			this.error(sprintf(lang("INVALID_DIRECTORY_OR_FILE"), file.getName()));
		} finally {
			try {
				if (os != null)
					os.close();
			} catch (Exception e2) {
			}
			try {
				if (fis != null)
					fis.close();
			} catch (Exception e2) {
			}
		}
	}

	public void preview(HttpServletResponse resp) {
		File file =this.documentRoot.resolve(this.get.get("path")).toFile();
		if (this.get.get("path") != null && file.exists()) {
			resp.setHeader("Content-type", "image/" + getFileExtension(file.getName()));
			resp.setHeader("Content-Transfer-Encoding", "Binary");
			resp.setHeader("Content-length", "" + file.length());
			resp.setHeader("Content-Disposition", "inline; filename=\"" + getFileBaseName(file.getName()) + "\"");
			readFile(resp, file);
		} else {
			error(sprintf(lang("FILE_DOES_NOT_EXIST"), this.get.get("path")));
		}
	}

	private String getFileBaseName(String filename) {
		String retval = filename;
		int pos = filename.lastIndexOf(".");
		if (pos > 0)
			retval = filename.substring(0, pos);
		return retval;
	}

	private String getFileExtension(String filename) {
		String retval = filename;
		int pos = filename.lastIndexOf(".");
		if (pos > 0)
			retval = filename.substring(pos + 1);
		return retval;
	}

	private void setParams() {
		if (this.referer != null) {
			String[] tmp = this.referer.split("\\?");
			String[] params_tmp = null;
			LinkedHashMap<String, String> params = new LinkedHashMap<String, String>();
			if (tmp.length > 1 && tmp[1] != "") {
				params_tmp = tmp[1].split("&");
				for (int i = 0; i < params_tmp.length; i++) {
					tmp = params_tmp[i].split("=");
					if (tmp.length > 1 && tmp[1] != "") {
						params.put(tmp[0], tmp[1]);
					}
				}
			}
			this.params = params;
		}
	}

	public String getConfigString(String key) {
		return config.getProperty(key);
	}

	public Path getDocumentRoot() {
		return this.documentRoot;
	}

	private void getFileInfo(String path) throws JSONException {
		String pathTmp = path;
		if ("".equals(pathTmp)) {
			pathTmp = this.get.get("path");
		}
		String[] tmp = pathTmp.split("/");
		File file = this.documentRoot.resolve(pathTmp).toFile();
		this.item = new HashMap();
		String fileName = tmp[tmp.length - 1];
		this.item.put("filename", fileName);
		if (file.isFile()) {
                    this.item.put("filetype", fileName.substring(fileName.lastIndexOf(".") + 1));
                }
		else {
                    this.item.put("filetype", "dir");
                }
		this.item.put("filemtime", "" + file.lastModified());
		this.item.put("filectime", "" + file.lastModified());

		this.item.put("preview", config.getProperty("icons-path") + "/" + config.getProperty("icons-default")); // @simo

		JSONObject props = new JSONObject();
		if (file.isDirectory()) {

			this.item.put("preview", config.getProperty("icons-path") + config.getProperty("icons-directory"));

		} else if (isImage(pathTmp)) {
			this.item.put("preview", "connectors/jsp/filemanager.jsp?mode=preview&path=" + pathTmp);
			Dimension imgData = getImageSize(documentRoot.resolve(pathTmp).toString());
			props.put("Height", "" + imgData.height);
			props.put("Width", "" + imgData.width);
			props.put("Size", "" + file.length());
		} else {
			File icon = fileManagerRoot.resolve(config.getProperty("icons-path")).resolve(
					((String) this.item.get("filetype")).toLowerCase() + ".png").toFile();
			if (icon.exists()) {
				this.item.put("preview",
						config.getProperty("icons-path") + ((String) this.item.get("filetype")).toLowerCase() + ".png");
				props.put("Size", "" + file.length());
			}
		}

		props.put("Date Modified", dateFormat.format(new Date(new Long((String) this.item.get("filemtime")))));
		this.item.put("properties", props);
	}

	private boolean isImage(String fileName) {
		boolean isImage = false;
		String ext = "";
		int pos = fileName.lastIndexOf(".");
		if (pos > 1 && pos != fileName.length()) {
			ext = fileName.substring(pos + 1);
			isImage = contains(config.getProperty("images"), ext);
		}
		return isImage;
	}

	public boolean contains(String where, String what) {
		boolean retval = false;

		String[] tmp = where.split(",");
		for (int i = 0; i < tmp.length; i++) {
			if (what.equalsIgnoreCase(tmp[i])) {
				retval = true;
				break;
			}
		}
		return retval;
	}

	private Dimension getImageSize(String path) {
		Dimension imgData = new Dimension();
		Image img = new ImageIcon(path).getImage();
		imgData.height = img.getHeight(null);
		imgData.width = img.getWidth(null);
		return imgData;
	}

	private void unlinkRecursive(File dir, boolean deleteRootToo) {
		//File dh = new File(dir);
		File fileOrDir = null;

		if (dir.exists()) {
			String[] objects = dir.list();
			for (int i = 0; i < objects.length; i++) {
				fileOrDir = new File(dir + "/" + objects[i]);
				if (fileOrDir.isDirectory()) {
					if (!objects[i].equals(".") && !objects[i].equals("..")) {
						unlinkRecursive(new File(dir + "/" + objects[i]), true);
					}
				}
				fileOrDir.delete();

			}
			if (deleteRootToo) {
				dir.delete();
			}
		}
	}

	private HashMap<String, String> cleanString(HashMap<String, String> strList, String[] allowed) {
		String allow = "";
		HashMap<String, String> cleaned = null;
		Iterator<String> it = null;
		String cleanStr = null;
		String key = null;
		for (int i = 0; i < allowed.length; i++) {
			allow += "\\" + allowed[i];
		}

		if (strList != null) {
			cleaned = new HashMap<String, String>();
			it = strList.keySet().iterator();
			while (it.hasNext()) {
				key = it.next();
				cleanStr = strList.get(key).replaceAll("[^{" + allow + "}_a-zA-Z0-9]", "");
				cleaned.put(key, cleanStr);
			}
		}
		return cleaned;
	}

	private String sanitize(String var) {
		String sanitized = var.replaceAll("\\<.*?>", "");
		sanitized = sanitized.replaceAll("http://", "");
		sanitized = sanitized.replaceAll("https://", "");
		sanitized = sanitized.replaceAll("\\.\\./", "");
		return sanitized;
	}

	private String checkFilename(String path, String filename, int i) {
		File file = new File(path + filename);
		String i2 = "";
		String[] tmp = null;
		if (!file.exists()) {
			return filename;
		} else {
			if (i != 0)
				i2 = "" + i;
			tmp = filename.split(i2 + "\\.");
			i++;
			filename = filename.replace(i2 + "." + tmp[tmp.length - 1], i + "." + tmp[tmp.length - 1]);
			return this.checkFilename(path, filename, i);
		}
	}

	private void loadConfig() {
		InputStream is;
		if (config == null) {
			try {
				//log.info("reading from " + this.fileManagerRoot.resolve("connectors/jsp/config.properties").toString());
				is = new FileInputStream( this.fileManagerRoot.resolve("connectors/jsp/config.properties").toString());
				config = new Properties();
				config.load(is);
			} catch (Exception e) {
				error("Error loading config file "+ this.fileManagerRoot.resolve("connectors/jsp/config.properties"));
			}
		}
	}

	private void loadLanguageFile() {

		// we load langCode var passed into URL if present
		// else, we use default configuration var
		if (language == null) {
			String lang = "";
			if (params.get("langCode") != null)
				lang = this.params.get("langCode");
			else
				lang = config.getProperty("culture");
			BufferedReader br = null;
			InputStreamReader isr = null;
			String text;
			StringBuffer contents = new StringBuffer();
			try {
				isr = new InputStreamReader(
						new FileInputStream(
								this.fileManagerRoot
								.resolve("scripts/languages/")
								.resolve(lang+ ".js").toString()
								), "UTF-8");
				br = new BufferedReader(isr);
				while ((text = br.readLine()) != null)
					contents.append(text);
				language = new JSONObject(contents.toString());
			} catch (Exception e) {
				this.error("Fatal error: Language file not found.");
			} finally {
				try {
					if (br != null)
						br.close();
				} catch (Exception e2) {
				}
				try {
					if (isr != null)
						isr.close();
				} catch (Exception e2) {
				}
			}
		}
	}

	public String sprintf(String text, String params) {
		String retText = text;
		String[] repl = params.split("#");
		for (int i = 0; i < repl.length; i++) {
			retText = retText.replaceFirst("%s", repl[i]);
		}
		return retText;
	}

	public void log(String filename, String msg) {
		try {
			BufferedWriter out = new BufferedWriter(new FileWriter(filename, true));
			out.append(msg + "\r\n");
			out.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
}
