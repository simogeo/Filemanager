/*
 * jQuery Impromptu
 * By: Trent Richardson [http://trentrichardson.com]
 * Version 1.5
 * Last Modified: 3/31/2008
 * 
 * Copyright 2008 Trent Richardson
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
jQuery.extend({	
	ImpromptuDefaults: { prefix:'jqi', buttons:{ Ok:true }, loaded:function(){}, submit:function(){return true;}, callback:function(){}, opacity:0.6, zIndex: 999, overlayspeed:'slow', promptspeed:'fast', show:'show', focus:0, useiframe:false },
	SetImpromptuDefaults: function(o){ 
		jQuery.ImpromptuDefaults = jQuery.extend({},jQuery.ImpromptuDefaults,o);
	},
	prompt: function(m,o){
		o = jQuery.extend({},jQuery.ImpromptuDefaults,o);
		
		var ie6 = (jQuery.browser.msie && jQuery.browser.version < 7);	
		var b = jQuery(document.body);
		var w = jQuery(window);
		
		
		
		var msgbox = '<div class="'+ o.prefix +'box" id="'+ o.prefix +'box">';		
		if(o.useiframe && ((jQuery.browser.msie && jQuery('object, applet').length > 0) || ie6))//if you want to use the iframe uncomment these 3 lines
			msgbox += '<iframe src="javascript:;" class="'+ o.prefix +'fade" id="'+ o.prefix +'fade"></iframe>';
		else{ 
			if(ie6) jQuery('select').css('visibility','hidden');
			msgbox +='<div class="'+ o.prefix +'fade" id="'+ o.prefix +'fade"></div>';
		}	
		msgbox += '<div class="'+ o.prefix +'" id="'+ o.prefix +'"><div class="'+ o.prefix +'container"><div class="'+ o.prefix +'close">X</div><div class="'+ o.prefix +'message">'+ m +'</div><div class="'+ o.prefix +'buttons" id="'+ o.prefix +'buttons">';
		jQuery.each(o.buttons,function(k,v){ msgbox += '<button name="'+ o.prefix +'button'+ k +'" id="'+ o.prefix +'button'+ k +'" value="'+ v +'">'+ k +'</button>'}) ;
		msgbox += '</div></div></div></div>';
		
		var jqib =b.append(msgbox).children('#'+ o.prefix +'box');
		var jqi = jqib.children('#'+ o.prefix);
		var jqif = jqib.children('#'+ o.prefix +'fade');

		var getWindowScrollOffset = function(){ 
			return (document.documentElement.scrollTop || document.body.scrollTop) + 'px'; 
		};		
		
		var getWindowSize = function(){ 
			var size = {
				width: window.innerWidth || (window.document.documentElement.clientWidth || window.document.body.clientWidth),
				height: window.innerHeight || (window.document.documentElement.clientHeight || window.document.body.clientHeight)
			};
			return size;
		};
		
		var ie6scroll = function(){ 
			jqib.css({ top: getWindowScrollOffset() }); 
		};
		
		var flashPrompt = function(){
			var i = 0;
			jqib.addClass(o.prefix +'warning');
			var intervalid = setInterval(function(){ 
				jqib.toggleClass(o.prefix +'warning');
				if(i++ > 1){
					clearInterval(intervalid);
					jqib.removeClass(o.prefix +'warning');
				}
			}, 100);			
		};		
		

		var escapeKeyClosePrompt = function(e){
			var kC = (window.event) ? event.keyCode : e.keyCode; // MSIE or Firefox?
			var Esc = (window.event) ? 27 : e.DOM_VK_ESCAPE; // MSIE : Firefox
			if(kC==Esc) removePrompt();
		};

		var positionPrompt = function(){
			var wsize = getWindowSize();
			jqib.css({ position: (ie6)? "absolute" : "fixed", height: wsize.height, width: "100%", top: (ie6)? getWindowScrollOffset():0, left: 0, right: 0, bottom: 0 });
			jqif.css({ position: "absolute", height: wsize.height, width: "100%", top: 0, left: 0, right: 0, bottom: 0 });
			jqi.css({ position: "absolute", top: "100px", left: "50%", marginLeft: ((((jqi.css("paddingLeft").split("px")[0]*1) + jqi.width())/2)*-1) });					
		};
		
		var stylePrompt = function(){
			jqif.css({ zIndex: o.zIndex, display: "none", opacity: o.opacity });
			jqi.css({ zIndex: o.zIndex+1, display: "none" });
		}
		
		var removePrompt = function(callCallback, clicked, msg){
			jqi.remove(); 
			if(ie6)b.unbind('scroll',ie6scroll);//ie6, remove the scroll event
			w.unbind('resize',positionPrompt);			
			jqif.fadeOut(o.overlayspeed,function(){
				jqif.unbind('click',flashPrompt);
				jqif.remove();
				if(callCallback) o.callback(clicked,msg);
				jqib.unbind('keypress',escapeKeyClosePrompt);
				jqib.remove();
				if(ie6 && !o.useiframe) jQuery('select').css('visibility','visible');
			});
		}
		
		positionPrompt();
		stylePrompt();	

		//Events
		jQuery('#'+ o.prefix +'buttons').children('button').click(function(){ 
			var msg = jqi.children('.'+ o.prefix +'container').children('.'+ o.prefix +'message');
			var clicked = o.buttons[jQuery(this).text()];	
			if(o.submit(clicked,msg))				
				removePrompt(true,clicked,msg);
		});
		if(ie6) w.scroll(ie6scroll);//ie6, add a scroll event to fix position:fixed
		jqif.click(flashPrompt);
		w.resize(positionPrompt);
		jqib.keypress(escapeKeyClosePrompt);
		jqi.find('.'+ o.prefix +'close').click(removePrompt);
		
		//Show it
		jqif.fadeIn(o.overlayspeed);
		jqi[o.show](o.promptspeed,o.loaded);
		jqi.find('#'+ o.prefix +'buttons button:eq('+ o.focus +')').focus();//focus the default button
		return jqib;
	}	
});