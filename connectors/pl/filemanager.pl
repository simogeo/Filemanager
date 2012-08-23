#!/usr/bin/env perl
use CGI;
use JSON;
use Image::Info qw( image_info image_type);
use File::Basename;
use File::MimeInfo;
use strict;

our $q;

#Edit this with your values in
my $config = {
  uploads_directory => "/tmp/uploads/",
  url_path => "/uploads/"
};

my $MODE_MAPPING = {
  '' => \&root,
  getinfo => \&getinfo,
  getfolder => \&getfolder,
};

sub main {
  $q = CGI->new;
  my $method = $MODE_MAPPING->{$q->param('mode')} || 'root';

  print $q->header('application/json');
  &$method;
}

#?mode=getinfo&path=/UserFiles/Image/logo.png&getsize=true
sub getinfo {
  return unless params_valid([qw(path getsize)]);

  my $filename = get_absolute_file_name($q->param('path'));
  my $info = image_info($filename);

  print_json($info);

  my $is_image = $info->{error} ? 0 : 1;

  print_json({
    "Path" => $filename,
    "Filename" => fileparse($filename),
    "File Type" => "png",
    "Preview" => url_for_filename($filename),
    "Properties" => {
      "Date Created" => '', #TODO
      "Date Modified" => '', #"02/09/2007 14:01:06", 
      "Height" => $info->{height},
      "Width" => $info->{width},
      "Size" => -s $filename 
    },
    "Error" => "",
    "Code" => 0
  });
}

sub getfolder {

}

sub rename {

}

sub delete {

}

sub add {

}

sub addfolder {

}

sub download {

}

sub get_absolute_file_name {
  my $file_path = shift;

  if($file_path =~ /\.\./g) {
    error("Invalid file path");
    return undef;
  } 

  return $config->{uploads_directory} . $file_path;
}

sub url_for_filename {
  my $filename = shift;
  return $config->{url_path} . $filename;
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
  })
}

sub print_json {
  my $hash = shift;

  my $json = JSON->new->convert_blessed->allow_blessed;

  print $json->encode($hash);
}

main();