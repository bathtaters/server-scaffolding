/// <reference path="./jquery-3.6.0.min.js" />

$(function() {
  $('button.toggle-password').text('Show').attr('aria-label', 'Show password as plain text.');
});

$( 'button.toggle-password' ).click(function() {
  var toggleButton = this
  $(this).siblings('input').each(function() {
    if ($(this).attr('type') === 'password') {
      $(this).attr('type', 'text');
      $(toggleButton).text('Hide');
      $(toggleButton).attr('aria-label', 'Hide password.');
    } else {
      $(this).attr('type', 'password');
      $(toggleButton).text('Show');
      $(toggleButton).attr('aria-label', 'Show password as plain text.');
    }
  })
});
