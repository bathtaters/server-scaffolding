/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#actionReset' ).on('click', function(ev) {
  if(!window.confirm('Are you sure you want to erase the entire table?')) {
    ev.preventDefault();
  }
});

/* Reset hidden fields on 'clear' */
$( 'input#clearForm' ).on('click', function() { $( 'input[type="hidden"]' ).val(""); });

/* Select row for editing */
$( 'tr.tableRow' ).on('click', function() {
  $(this).children('td').each(function() {
    $( '#'+$(this).attr('data-key') ).val($(this).text());
  });
});

/* Swap two IDs */
$( '#actionSwap' ).on('click', function() {
  var sendData = { swap: $( 'input#swapId' ).val() };
  var idElem = $( '#primary-key input' );
  var idVal = idElem.val();
  if (!idVal || !sendData.swap) { return window.alert('Must enter Main ID & Swap IDs to swap.'); }
  sendData[idElem.attr('id')] = idVal;

  $.ajax({
    type:    "POST",
    url:     $( 'form#editForm' ).attr('action').replace('/form', '/swap'),
    data:    sendData,
    success: function(data) {
        if (!data.success) { window.alert('Error performing swap: '+(data.error || 'Unknown error')); }
        else { window.location.reload(); }
      },
    error:   function(jqXHR, textStatus, errorThrown) {
        window.alert("Error performing swap!\n" + (
          jqXHR.responseJSON.error || errorThrown + " [" + textStatus + "]"
        ));
    }
  });
});