/// <reference path="./jquery-3.6.0.min.js" />

$(function() {
  $('input.filter-level[value="all"]').attr('disabled', true);
});

$( 'input.filter-level' ).on('click', function() {
  var filter = 'level-' + $(this).val();
  $( '.log' ).children('.line').each(function() {
    if (filter === 'level-all' || $(this).hasClass(filter)) {
      $(this).removeClass('hidden');
    } else {
      $(this).addClass('hidden');
    }
  });

  $( 'input.filter-level' ).each(function() {
    $(this).attr('disabled', false);
  });
  $(this).attr('disabled', true);

});