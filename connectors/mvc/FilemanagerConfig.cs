using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Configuration;

namespace Filemanager
{
    /// <summary>
    /// Filemanager configuration settings
    /// </summary>
    public class FilemanagerConfig
    {
        /// <summary>
        /// Root directory for all file uploads [string]
        /// Set in web.config. E.g. <add key="Filemanager_RootPath" value="/uploads/"/>
        /// </summary>
        public string RootPath { get; set; }

        /// <summary>
        /// Directory for icons. [string]
        /// Set in web.config E.g. <add key="Filemanager_IconDirectory" value="/Scripts/filemanager/images/fileicons/"/>
        /// </summary>
        public string IconDirectory { get; set; }

        /// <summary>
        /// White list of allowed file extensions
        /// </summary>
        public List<string> AllowedExtensions { get; set; }

        /// <summary>
        /// List of image file extensions
        /// </summary>
        public List<string> ImgExtensions { get; set; }

        /// <summary>
        /// Constructor
        /// </summary>
        public FilemanagerConfig()
        {
            RootPath = WebConfigurationManager.AppSettings["FileManager_RootPath"];
            IconDirectory = WebConfigurationManager.AppSettings["Filemanager_IconDirectory"];
            AllowedExtensions = new List<string> { ".ai", ".asx", ".avi", ".bmp", ".csv", ".dat", ".doc", ".docx", ".epub", ".fla", ".flv", ".gif", ".html", ".ico", ".jpeg", ".jpg", ".m4a", ".mobi", ".mov", ".mp3", ".mp4", ".mpa", ".mpg", ".mpp", ".pdf", ".png", ".pps", ".ppsx", ".ppt", ".pptx", ".ps", ".psd", ".qt", ".ra", ".ram", ".rar", ".rm", ".rtf", ".svg", ".swf", ".tif", ".txt", ".vcf", ".vsd", ".wav", ".wks", ".wma", ".wmv", ".wps", ".xls", ".xlsx", ".xml", ".zip" };
            ImgExtensions = new List<string> { ".gif", ".jpe", ".jpeg", ".jpg", ".png", ".svg" };
        }
    }
}