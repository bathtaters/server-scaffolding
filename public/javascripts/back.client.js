/// <reference path="./jquery-3.6.0.min.js" />

$( '#back-button' ).on('click', function(ev) {
  ev.preventDefault();
  history.go(-1);
})