#!/usr/bin/env perl
use CGI;
use JSON;
use Image::Info qw( image_info image_type);
use File::Basename;
use File::MimeInfo;
use File::Find::Rule;
use strict;
use Data::Dumper;

our $q;

#Edit this with your values in
my $config = {
  uploads_directory => "/tmp/uploads", #Absolute path to where the root of your files are
  url_path => "/Filemanager/userfiles" #The root that the user thinks the files are at
};

my $MODE_MAPPING = {
  '' => \&root,
  getinfo => \&getinfo,
  getfolder => \&getfolder,
  rename => \&rename
};

sub main {
  $q = CGI->new;
  my $method = $MODE_MAPPING->{$q->param('mode')} || \&root;

  print $q->header('application/json');
  &$method;
}

#?mode=getinfo&path=/UserFiles/Image/logo.png&getsize=true
#For now return image size info anyway
sub getinfo {
  return unless params_valid([qw(path)]);

  my $filename = relative_file_name_from_url($q->param('path'));

  print_json(file_info($filename));
}

sub file_info {
  my $rel_filename = shift;
  my $abs_filename = absolute_file_name_from_url($rel_filename);
  my $url_filename = url_for_relative_filename($rel_filename);

  my $info = image_info($abs_filename);
  my ($fileparse_filename, $fileparse_dirs, $fileparse_suffix) = fileparse($abs_filename);
  $fileparse_filename =~ /\.(.+)/;
  my $suffix = $1 || "";

  my $directory = -d $abs_filename;
  if($directory) {
    $url_filename .= "/";
  }

  return {
    "Path" => $url_filename,
    "Filename" => $fileparse_filename,
    "File Type" => $directory ? "dir" : $suffix,
    "Preview" => $directory ? "images\/fileicons\/_Open.png" : $url_filename,
    "Properties" => {
      "Date Created" => '', #TODO
      "Date Modified" => '', #"02/09/2007 14:01:06", 
      "Height" => $info->{height},
      "Width" => $info->{width},
      "Size" => -s $abs_filename 
    },
    "Error" => "",
    "Code" => 0
  }
}

# ?mode=getfolder&path=/UserFiles/Image/&getsizes=true&type=images
#Ignoring type for now
sub getfolder {
  return unless params_valid([qw(path type)]);

  my @directory_list = ();

  my $rel_directory = relative_file_name_from_url($q->param('path'));
  my $directory = absolute_file_name_from_relative($rel_directory);

  my @directories = File::Find::Rule->maxdepth(1)->directory->in( $directory );
  my @files = File::Find::Rule->maxdepth(1)->file->in( $directory );

  foreach my $dir (@directories) {
    my $url_filename = url_for_relative_filename(relative_file_name_from_absolute($dir));
    #Skip current directory
    next if relative_file_name_from_absolute($dir) eq $rel_directory;

    # push(@directory_list, { $url_filename => file_info(relative_file_name_from_absolute($dir)) });
    push(@directory_list, file_info(relative_file_name_from_absolute($dir)));
  }

  foreach my $file (@files) {
    my $url_filename = url_for_relative_filename(relative_file_name_from_absolute($file));
    # push(@directory_list, { $url_filename => file_info(relative_file_name_from_absolute($file)) });
    push(@directory_list, file_info(relative_file_name_from_absolute($file)) );
  }

  print_json(\@directory_list);
}

# ?mode=rename&old=/UserFiles/Image/logo.png&new=id.png
sub rename {
  return unless params_valid([qw(old new)]);
  my $full_old = absolute_file_name_from_url($q->param('old'));
  my $full_new = absolute_file_name_from_url($q->param('new'));

  my $old_name = fileparse($full_old);
  my $new_name = fileparse($full_new);

  my $success = rename $full_old, $full_new;

  print_json({
    "Error" => $success ? "No error" : "Could not rename",
    "Code" => !$success,
    "Old Path" => $q->param('old'),
    "Old Name" => $old_name,
    "New Path" => $q->param('new'), 
    "New Name" => $new_name
  });
}


sub delete {

}

sub add {

}

sub addfolder {

}

sub download {

}

#Get relative_file_name
#Get absolute_file_name
#Get url_for

sub relative_file_name_from_url {
  my $file = shift;

  $file =~ s/$config->{url_path}//;
  return remove_extra_slashes($file);
}

sub relative_file_name_from_absolute {
  my $file = shift;
  $file =~ s/$config->{uploads_directory}//;
  return remove_extra_slashes($file);  
}

sub absolute_file_name_from_url {
  my $file_path = shift;

  if($file_path =~ /\.\./g) {
    error("Invalid file path");
    return undef;
  } 
  my $filename =  $config->{uploads_directory} . '/' . relative_file_name_from_url($file_path);
  return remove_extra_slashes($filename);
}

sub absolute_file_name_from_relative {
  my $filename = $config->{uploads_directory} . "/" . shift;
  return remove_extra_slashes($filename);  
}

sub url_for_relative_filename {
  my $filename = shift;
  my $url = $config->{url_path} . '/' .$filename;
  return remove_extra_slashes($url);
}

sub remove_extra_slashes {
  my $filename = shift;
  $filename =~ s/\/\//\//g;
  #Strip ending slash too
  $filename =~ s/\/$//g;
  return $filename;  
}

sub params_valid {
  my $params = shift;

  foreach my $param(@$params) {
    unless($q->param($param)) {
      error("$param missing");
      return undef;
    };
  }

  return 1;
}

#return json error
sub root {
  error("Mode not specified");
}

sub error {
  my $error = shift;
  print_json ({
    "Error" => $error,
    "Code" =>  -1    
  });
  $q->end_html;  
  die "Couldn't carry on";
}

sub print_json {
  my $hash = shift;

  my $json = JSON->new->convert_blessed->allow_blessed;

  print $json->encode($hash);
}

main();