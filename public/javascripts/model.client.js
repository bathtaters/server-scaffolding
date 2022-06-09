/* Table reset confirmation */
$( 'input#actionReset' ).click(function(ev) {
  if(!window.confirm('Are you sure you want to erase the entire table?')) {
    ev.preventDefault();
  }
});

/* Select row for editing */
$( 'tr.tableRow' ).click(function() {
  $(this).children('td').each(function() {
    $( '#'+$(this).attr('data-key') ).val($(this).text());
  });
});

/* Swap two IDs */
$( '#actionSwap' ).click(function() {
  $.ajax({
    type:    "POST",
    url:     $( 'form#editForm' ).attr('action').replace('/form', '/swap'),
    data:    { id: $( 'input#id' ).val(), swap: $( 'input#swapId' ).val() },
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