/* 
Xin chao ban toi PokeMon Viet Nam ! Tro choi duoc Build Xay dung boi DucNghia ( fb.com/ducnghiaq)
cac ma nguon chinh cua tro choi : PHP,Nodejs(socket.io),Mysql,html5,javascript
Cac game duoc tich hop duoc share tren mang xa hoi !
////ENGLISH 

Welcome to PokeMOn Vietnam. The game was founded by DucNghia with the source code shared on social networks!
The game works on servers: php 5.6, mysql, websocket, html5 etc.
When participating in Vietnam pokemon, you must accept the following terms:
1, User account must be responsible for the use license! accounts must not be vulgar, disrespectful regarding organizations ...

2, Participating users must approve the actions they cause if they damage the pokemon server! You may be banned from playing or permanently deleted.

3, PokeMon Vietnam is not founded by any organization or business that stands out and develops.
PokeMon Vietnam is just a small game for Vietnamese people! License of the problem completely belongs to PokeMon company.

*/

  $(document).ready( function () {
    opengame();
});

function opengame(){
    var ducnghia_wcs=$(window).height();
    var ducnghia_wcw=$(window).width();
    if(ducnghia_wcw>=490)
    {
        ducnghia_wcw=490;
        
    }
          var ducnghiacssx = document.getElementsByTagName('ducnghia');

    
    ducnghiacssx[0].innerHTML  = '<iframe src="/game.json" style="width: '+ducnghia_wcw+'px; height: '+ducnghia_wcs+'px"scrolling="no" marginwidth="0" marginheight="0" frameborder="0" vspace="0" hspace="0"></iframe>';
}