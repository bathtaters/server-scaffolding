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

/* Enable/Disable search restrictions */
$(function() {
  var idElem = $( '#primary-key input' );

  $( 'input[min]' ).each(function() {
    var min = $(this).attr('min');
    if (+min > 0) { $(this).attr('data-min', min); }
  });
  $( 'input[minLength]' ).each(function() {
    var min = $(this).attr('minLength');
    if (+min > 0) { $(this).attr('data-minLength', min); }
  });

  function enableSearch() {
    idElem.attr('readonly', false);
    $( 'input#swapId' ).attr('disabled', true);
    $( 'input#actionSwap' ).attr('disabled', true);
    $( 'input[type="submit"]:not(#actionSearch)' ).attr('disabled', true);
    $( 'input[data-min]' ).each(function() { $(this).attr('min', false); });
    $( 'input[data-minLength]' ).each(function() { $(this).attr('minLength', false); });
  }

  function disableSearch() {
    idElem.attr('readonly', true);
    $( 'input#swapId' ).attr('disabled', false);
    $( 'input#actionSwap' ).attr('disabled', false);
    $( 'input[type="submit"]' ).attr('disabled', false);
    $( 'input[data-min]' ).each(function() { $(this).attr('min', $(this).attr('data-min')); });
    $( 'input[data-minLength]' ).each(function() { $(this).attr('minLength', $(this).attr('data-minLength')); });
  }

  if ($( 'input#searchMode' ).prop('checked')) { enableSearch(); }
  if($( 'input#forceSearch' ).val()) { enableSearch(); }
  
  $( 'input#clearForm' ).on('click', function() { disableSearch(); });

  $( 'input#searchMode' ).on('input', function() {
    if ($(this).prop('checked')) { enableSearch(); }
    else { disableSearch(); }
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