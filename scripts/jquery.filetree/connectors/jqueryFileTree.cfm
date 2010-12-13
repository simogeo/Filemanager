<!---

	Filemanager Coldfusion connector
	
	filemanager.cfm
	
	@license MIT License
	@author James Gibson <james.gibson (at) liquifusion (dot) com>
	@copyright Author

--->
<cfsilent>
	<!--- include our configuration file --->
	<cfinclude template="/connectors/cfm/filemanager.config.cfm" />
	
	<!--- make sure we have a default directory --->
	<cfparam name="form.dir" default="/#config.base#" />
	
	<!--- validate that the request is authorized to access the file system --->
	<cfif not authorize() or form.dir does not contain config.base>
		<cfabort />
	</cfif>
	
	<cfset form.path = ExpandPath(URLDecode(form.dir)) />
	
	<cfif not DirectoryExists(form.path)>
		<cfabort />
	</cfif>
	
	<cfdirectory action="list" directory="#form.path#" name="contents" sort="type, name" type="all" listinfo="all" recurse="false" />
	
	<cfsavecontent variable="response">
		<cfoutput>
			<ul class="jqueryFileTree" style="display:none;">
				<cfloop query="contents">
					<cfif contents.type eq "dir" and  not ListFindNoCase(config.tree.exclude, contents.name)>
						<li class="directory collapsed"><a href="##" rel="#URLDecode(form.dir)##contents.name#/">#contents.name#</a></li>
					<cfelseif contents.type eq "file">
						<li class="file ext_#ListLast(contents.name, '.')#"><a href="##" rel="#URLDecode(form.dir)##contents.name#">#contents.name# (#Round(contents.size/1024)#KB)</a></li>
					</cfif>
				</cfloop>
			</ul>
		</cfoutput>
	</cfsavecontent> 
	
</cfsilent>
<cfoutput>#response#</cfoutput>