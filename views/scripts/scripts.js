//flash message animation snippet
if($("#messages").length > 0){
        // wait 1.5 sec to add fade out for flash messages.
        setTimeout(function(){
        $("#messages").addClass('animated fadeOut');
        //detect animation end.
        $("#messages").one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
            //on animation end remove messages div.
            $("#messages").hide();
            
        });
        }, 1500)
    }