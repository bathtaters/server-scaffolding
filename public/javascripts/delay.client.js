/// <reference path="./jquery-3.6.0.min.js" />

$(function() {
  var countdown = $('#countdown');
  var url = $('a#fwdLink').attr('href');

  var countId = false;
  var count = parseInt(countdown.text());

  function decCount() {
    count = count - 1;
    countdown.text(count);

    if (count > 0) { return; }

    if (countId) { clearInterval(countId); }

    window.location.href = url;

    $('#countLine').addClass('hidden');
    $('#linkLine').removeClass('hidden');
  }
  
  countId = setInterval(decCount, 1000);
});