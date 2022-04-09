// Filemanager ASP.NET MVC connector
// Author: David Hammond <dave@modernsignal.com>
// Based on ASHX connection by Ondřej "Yumi Yoshimido" Brožek | <cholera@hzspraha.cz>

using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;

namespace Filemanager
{
    /// <summary>
    /// Filemanager controller
    /// </summary>
    public class FilemanagerController : Controller
    {
        /// <summary>
        /// Configuration settings
        /// </summary>
        private FilemanagerConfig config = new FilemanagerConfig();

        /// <summary>
        /// Serializer for generating json responses
        /// </summary>
        private JavaScriptSerializer json = new JavaScriptSerializer();

        /// <summary>
        /// Process file manager action
        /// </summary>
        /// <param name="mode"></param>
        /// <param name="path"></param>
        /// <returns></returns>
        [Authorize()]
        public ActionResult Index(string mode, string path = null)
        {
            Response.ClearHeaders();
            Response.ClearContent();
            Response.Clear();

            try
            {
                switch (mode)
                {
                    case "getinfo":
                        return Content(GetInfo(path), "application/json", Encoding.UTF8);

                    case "getfolder":
                        return Content(GetFolderInfo(path), "application/json", Encoding.UTF8);

                    case "move":
                        var oldPath = Request.QueryString["old"];
                        var newPath = string.Format("{0}{1}/{2}", Request.QueryString["root"], Request.QueryString["new"], Path.GetFileName(oldPath));
                        return Content(Move(oldPath, newPath), "application/json", Encoding.UTF8);

                    case "rename":
                        return Content(Rename(Request.QueryString["old"], Request.QueryString["new"]), "application/json", Encoding.UTF8);

                    case "replace":
                        return Content(Replace(Request.Form["newfilepath"]), "text/html", Encoding.UTF8);

                    case "delete":
                        return Content(Delete(path), "application/json", Encoding.UTF8);

                    case "addfolder":
                        return Content(AddFolder(path, Request.QueryString["name"]), "application/json", Encoding.UTF8);

                    case "download":
                        if (System.IO.File.Exists(Server.MapPath(path)) && IsInRootPath(path))
                        {
                            FileInfo fi = new FileInfo(Server.MapPath(path));
                            Response.AddHeader("Content-Disposition", "attachment; filename=" + Server.UrlPathEncode(path));
                            Response.AddHeader("Content-Length", fi.Length.ToString());
                            return File(fi.FullName, "application/octet-stream");
                        }
                        else
                        {
                            return new HttpNotFoundResult("File not found");
                        }
                    case "add":
                        return Content(AddFile(Request.Form["currentpath"]), "text/html", Encoding.UTF8);

                    case "preview":
                        var fi2 = new FileInfo(Server.MapPath(Request.QueryString["path"]));
                        return new FilePathResult(fi2.FullName, "image/" + fi2.Extension.TrimStart('.'));

                    default:
                        return Content(Error(string.Format("{0} not implemented", mode)));
                }
            }
            catch (HttpException he)
            {
                return Content(Error(he.Message), "application/json", Encoding.UTF8);
            }
        }

        /// <summary>
        /// Is the file an image file
        /// </summary>
        /// <param name="fileInfo"></param>
        /// <returns></returns>
        private bool IsImage(FileInfo fileInfo)
        {
            return config.ImgExtensions.Contains(Path.GetExtension(fileInfo.FullName).ToLower());
        }

        /// <summary>
        /// Is the file in the root path?  Don't allow uploads outside the root path.
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        private bool IsInRootPath(string path)
        {
            return path != null && Path.GetFullPath(path).StartsWith(Path.GetFullPath(config.RootPath));
        }

        /// <summary>
        /// Add a file
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        private string AddFile(string path)
        {
            string response;

            if (Request.Files.Count == 0 || Request.Files[0].ContentLength == 0)
            {
                response = Error("No file provided.");
            }
            else
            {
                if (!IsInRootPath(path))
                {
                    response = Error("Attempt to add file outside root path");
                }
                else
                {
                    System.Web.HttpPostedFileBase file = Request.Files[0];
                    if (!config.AllowedExtensions.Contains(Path.GetExtension(file.FileName).ToLower()))
                    {
                        response = Error("Uploaded file type is not allowed.");
                    }
                    else
                    {
                        //Only allow certain characters in file names
                        var baseFileName = Regex.Replace(Path.GetFileNameWithoutExtension(file.FileName), @"[^\w_-]", "");
                        var filePath = Path.Combine(path, baseFileName + Path.GetExtension(file.FileName));

                        //Make file name unique
                        var i = 0;
                        while (System.IO.File.Exists(Server.MapPath(filePath)))
                        {
                            i = i + 1;
                            baseFileName = Regex.Replace(baseFileName, @"_[\d]+$", "");
                            filePath = Path.Combine(path, baseFileName + "_" + i + Path.GetExtension(file.FileName));
                        }
                        file.SaveAs(Server.MapPath(filePath));

                        response = json.Serialize(new
                        {
                            Path = path,
                            Name = Path.GetFileName(file.FileName),
                            Error = "No error",
                            Code = 0
                        });
                    }
                }
            }
            return "<textarea>" + response + "</textarea>";
        }

        /// <summary>
        /// Add a folder
        /// </summary>
        /// <param name="path"></param>
        /// <param name="newFolder"></param>
        /// <returns></returns>
        private string AddFolder(string path, string newFolder)
        {
            if (!IsInRootPath(path))
            {
                return Error("Attempt to add folder outside root path");
            }

            Directory.CreateDirectory(Path.Combine(Server.MapPath(path), newFolder));
            return json.Serialize(new
            {
                Parent = path,
                Name = newFolder,
                Error = "",
                Code = 0
            });
        }

        /// <summary>
        /// Delete a file
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        private string Delete(string path)
        {
            if (!IsInRootPath(path))
            {
                return Error("Attempt to delete file outside root path");
            }
            if (!System.IO.File.Exists(Server.MapPath(path)) && !Directory.Exists(Server.MapPath(path)))
            {
                return Error("File not found");
            }

            FileAttributes attr = System.IO.File.GetAttributes(Server.MapPath(path));

            if ((attr & FileAttributes.Directory) == FileAttributes.Directory)
            {
                Directory.Delete(Server.MapPath(path), true);
            }
            else
            {
                System.IO.File.Delete(Server.MapPath(path));
            }

            return json.Serialize(new
            {
                Path = path,
                Error = "",
                Code = 0
            });
        }

        /// <summary>
        /// Generate json for error message
        /// </summary>
        /// <param name="msg"></param>
        /// <returns></returns>
        private string Error(string msg)
        {
            return json.Serialize(new
            {
                Error = msg,
                Code = -1
            });
        }

        /// <summary>
        /// Get directory info to return to Filemanager
        /// </summary>
        /// <param name="dirInfo"></param>
        /// <param name="fullPath"></param>
        /// <returns></returns>
        private Dictionary<string, object> GetDirectoryInfo(DirectoryInfo dirInfo, string fullPath)
        {
            return new Dictionary<string, object>
            {
                { "Path", fullPath },
                { "Filename", dirInfo.Name },
                { "File Type", "dir" },
                { "Protected", dirInfo.Attributes.HasFlag(FileAttributes.ReadOnly) ? 1 : 0 },
                { "Preview", config.IconDirectory + "_Open.png" },
                {
                    "Properties", new Dictionary<string, object>
                    {
                        { "Date Created", dirInfo.CreationTime.ToString() },
                        { "Date Modified", dirInfo.LastWriteTime.ToString() },
                        { "Height", 0 },
                        { "Width", 0 },
                        { "Size", 0 }
                    }
                },
                { "Error", "" },
                { "Code", 0 }
            };
        }

        /// <summary>
        /// Get file info to return to Filemanager
        /// </summary>
        /// <param name="fileInfo"></param>
        /// <param name="fullPath"></param>
        /// <returns></returns>
        private Dictionary<string, object> GetFileInfo(FileInfo fileInfo, string fullPath)
        {
            string icon;
            int height = 0;
            int width = 0;
            if (IsImage(fileInfo))
            {
                icon = fullPath + "?" + fileInfo.LastWriteTime.Ticks.ToString();
            }
            else
            {
                icon = String.Format("{0}{1}.png", config.IconDirectory, fileInfo.Extension.Replace(".", ""));
                if (!System.IO.File.Exists(Server.MapPath(icon)))
                {
                    icon = String.Format("{0}default.png", config.IconDirectory);
                }
            }
            if (IsImage(fileInfo))
            {
                try
                {
                    using (System.Drawing.Image img = System.Drawing.Image.FromFile(fileInfo.FullName))
                    {
                        height = img.Height;
                        width = img.Width;
                    }
                }
                catch { }
            }

            return new Dictionary<string, object>
            {
                { "Path", fullPath },
                { "Filename", fileInfo.Name },
                { "File Type", fileInfo.Extension.Replace(".", "") },
                { "Protected", fileInfo.IsReadOnly ? 1 : 0 },
                { "Preview", icon },
                {
                    "Properties", new Dictionary<string, object>
                    {
                        { "Date Created", fileInfo.CreationTime.ToString() },
                        { "Date Modified", fileInfo.LastWriteTime.ToString() },
                        { "Height", height },
                        { "Width", width },
                        { "Size", fileInfo.Length }
                    }
                },
                { "Error", "" },
                { "Code", 0 }
            };
        }

        /// <summary>
        /// Get folder information
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        private string GetFolderInfo(string path)
        {
            if (!IsInRootPath(path))
            {
                return Error("Attempt to view files outside root path");
            }
            if (!Directory.Exists(Server.MapPath(path)))
            {
                return Error("Directory not found");
            }

            DirectoryInfo RootDirInfo = new DirectoryInfo(Server.MapPath(path));
            var list = new Dictionary<string, object>();

            foreach (DirectoryInfo dirInfo in RootDirInfo.GetDirectories())
            {
                var fullPath = Path.Combine(path, dirInfo.Name);
                list.Add(fullPath, GetDirectoryInfo(dirInfo, fullPath + "/"));
            }

            foreach (FileInfo fileInfo in RootDirInfo.GetFiles())
            {
                var fullPath = Path.Combine(path, fileInfo.Name);
                list.Add(fullPath, GetFileInfo(fileInfo, fullPath));
            }

            return json.Serialize(list);
        }

        /// <summary>
        /// Get file information
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        private string GetInfo(string path)
        {
            if (!IsInRootPath(path))
            {
                return Error("Attempt to view file outside root path");
            }
            if (!System.IO.File.Exists(Server.MapPath(path)) && !Directory.Exists(Server.MapPath(path)))
            {
                return Error("File not found");
            }

            FileAttributes attr = System.IO.File.GetAttributes(Server.MapPath(path));

            if ((attr & FileAttributes.Directory) == FileAttributes.Directory)
            {
                return json.Serialize(GetDirectoryInfo(new DirectoryInfo(Server.MapPath(path)), path));
            }
            else
            {
                return json.Serialize(GetFileInfo(new FileInfo(Server.MapPath(path)), path));
            }
        }

        private string Move(string oldPath, string newPath)
        {
            if (!IsInRootPath(oldPath))
            {
                return Error("Attempt to modify file outside root path");
            }
            else if (!IsInRootPath(newPath))
            {
                return Error("Attempt to move a file outside root path");
            }
            else if (!System.IO.File.Exists(Server.MapPath(oldPath)) && !Directory.Exists(Server.MapPath(oldPath)))
            {
                return Error("File not found");
            }

            FileAttributes attr = System.IO.File.GetAttributes(Server.MapPath(oldPath));

            if ((attr & FileAttributes.Directory) == FileAttributes.Directory)
            {
                DirectoryInfo oldDir = new DirectoryInfo(Server.MapPath(oldPath));
                newPath = Path.Combine(newPath, oldDir.Name);
                Directory.Move(Server.MapPath(oldPath), Server.MapPath(newPath));
                DirectoryInfo newDir = new DirectoryInfo(Server.MapPath(newPath));

                return json.Serialize(new Dictionary<string, object>
                {
                    { "Old Path", oldPath },
                    { "Old Name", oldDir.Name },
                    { "New Path", newDir.FullName.Replace(HttpRuntime.AppDomainAppPath, "/").Replace(Path.DirectorySeparatorChar, '/') },
                    { "New Name", newDir.Name },
                    { "Error", "" },
                    { "Code", 0 }
                });
            }
            else
            {
                FileInfo oldFile = new FileInfo(Server.MapPath(oldPath));
                FileInfo newFile = new FileInfo(Server.MapPath(newPath));
                if (newFile.Extension != oldFile.Extension)
                {
                    //Don't allow extension to be changed
                    newFile = new FileInfo(Path.ChangeExtension(newFile.FullName, oldFile.Extension));
                }
                System.IO.File.Move(oldFile.FullName, newFile.FullName);

                return json.Serialize(new Dictionary<string, object>
                {
                    { "Old Path", oldPath.Replace(oldFile.Name, "") },
                    { "Old Name", oldFile.Name },
                    { "New Path", newFile.FullName.Replace(HttpRuntime.AppDomainAppPath, "/").Replace(Path.DirectorySeparatorChar, '/').Replace(newFile.Name, "") },
                    { "New Name", newFile.Name },
                    { "Error", "" },
                    { "Code", 0 }
                });
            }
        }

        /// <summary>
        /// Rename a file or directory
        /// </summary>
        /// <param name="path"></param>
        /// <param name="newName"></param>
        /// <returns></returns>
        private string Rename(string path, string newName)
        {
            if (!IsInRootPath(path))
            {
                return Error("Attempt to modify file outside root path");
            }
            if (!System.IO.File.Exists(Server.MapPath(path)) && !Directory.Exists(Server.MapPath(path)))
            {
                return Error("File not found");
            }

            FileAttributes attr = System.IO.File.GetAttributes(Server.MapPath(path));

            if ((attr & FileAttributes.Directory) == FileAttributes.Directory)
            {
                DirectoryInfo oldDir = new DirectoryInfo(Server.MapPath(path));
                Directory.Move(Server.MapPath(path), Path.Combine(oldDir.Parent.FullName, newName));
                DirectoryInfo newDir = new DirectoryInfo(Path.Combine(oldDir.Parent.FullName, newName));

                return json.Serialize(new Dictionary<string, object>
                {
                    { "Old Path", path },
                    { "Old Name", oldDir.Name },
                    { "New Path", newDir.FullName.Replace(HttpRuntime.AppDomainAppPath, "/").Replace(Path.DirectorySeparatorChar, '/') },
                    { "New Name", newDir.Name },
                    { "Error", "" },
                    { "Code", 0 }
                });
            }
            else
            {
                FileInfo oldFile = new FileInfo(Server.MapPath(path));
                //Don't allow extension to be changed
                newName = Path.GetFileNameWithoutExtension(newName) + oldFile.Extension;
                FileInfo newFile = new FileInfo(Path.Combine(oldFile.Directory.FullName, newName));
                System.IO.File.Move(oldFile.FullName, newFile.FullName);

                return json.Serialize(new Dictionary<string, object>
                {
                    { "Old Path", path },
                    { "Old Name", oldFile.Name },
                    { "New Path", newFile.FullName.Replace(HttpRuntime.AppDomainAppPath, "/").Replace(Path.DirectorySeparatorChar, '/') },
                    { "New Name", newFile.Name },
                    { "Error", "" },
                    { "Code", 0 }
                });
            }
        }

        /// <summary>
        /// Replace a file
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        private string Replace(string path)
        {
            if (Request.Files.Count == 0 || Request.Files[0].ContentLength == 0)
            {
                return Error("No file provided.");
            }
            else if (!IsInRootPath(path))
            {
                return Error("Attempt to replace file outside root path");
            }
            else
            {
                var fi = new FileInfo(Server.MapPath(path));
                HttpPostedFileBase file = Request.Files[0];
                if (!config.AllowedExtensions.Contains(Path.GetExtension(file.FileName).ToLower()))
                {
                    return Error("Uploaded file type is not allowed.");
                }
                else if (!Path.GetExtension(file.FileName).Equals(fi.Extension))
                {
                    return Error("Replacement file must have the same extension as the file being replaced.");
                }
                else if (!fi.Exists)
                {
                    return Error("File to replace not found.");
                }
                else
                {
                    file.SaveAs(fi.FullName);

                    return "<textarea>" + json.Serialize(new
                    {
                        Path = path.Replace("/" + fi.Name, ""),
                        Name = fi.Name,
                        Error = "No error",
                        Code = 0
                    }) + "</textarea>";
                }
            }
        }
    }
}