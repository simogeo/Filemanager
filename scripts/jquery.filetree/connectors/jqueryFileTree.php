<?php
require('../../../connectors/php/filemanager.config.php');
(isset($config['doc_root'])) ? $root = $config['doc_root'] : $root = $_SERVER['DOCUMENT_ROOT'].'/';

//
// jQuery File Tree PHP Connector
//
// Version 1.01
//
// Cory S.N. LaViska
// A Beautiful Site (http://abeautifulsite.net/)
// 24 March 2008
//
// History:
//
// 1.01 - updated to work with foreign characters in directory/file names (12 April 2008)
// 1.00 - released (24 March 2008)
//
// Output a list of files for jQuery File Tree
//
//$_POST['dir'] = urldecode($_POST['dir']);
$_POST['dir'] = str_replace('http://' . $_SERVER['HTTP_HOST'].'/', '', urldecode($_POST['dir']));
$path = str_replace('//','/' , $root . $_POST['dir']); // we remove double slash

// Check if user is authorized
if(auth()) {

  if( file_exists($path) ) {
    $files = scandir($path);
    natcasesort($files);
    echo "<ul class=\"jqueryFileTree\" style=\"display: none;\">";
    if( count($files) > 2 ) { /* The 2 accounts for . and .. */
      // All dirs
      foreach( $files as $file ) {
        if( file_exists($path . $file) && !in_array($file, $config['unallowed_dirs']) && $file != '.' && $file != '..' && is_dir($root . $_POST['dir'] . $file) ) {
          echo "<li class=\"directory collapsed\"><a href=\"#\" rel=\"" . htmlentities($_POST['dir'] . $file, ENT_COMPAT, 'UTF-8') . "/\">" . htmlentities($file, ENT_COMPAT, 'UTF-8') . "</a></li>";
        }
      }
      // All files
      foreach( $files as $file ) {
        if( file_exists($path . $file) && !in_array($file, $config['unallowed_files']) && $file != '.' && $file != '..' && !is_dir($root . $_POST['dir'] . $file) ) {
          $ext = preg_replace('/^.*\./', '', $file);
          echo "<li class=\"file ext_".strtolower($ext)."\"><a href=\"#\" rel=\"" . htmlentities($_POST['dir'] . $file, ENT_COMPAT, 'UTF-8') . "\">" . htmlentities($file, ENT_COMPAT, 'UTF-8'). "</a></li>";
        }
      }
    }
    echo "</ul>";
  }

}

?>