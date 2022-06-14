/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#actionReset' ).click(function(ev) {
  if(!window.confirm('WARNING! This will remove all users and log you out, are you sure you want to do this?')) {
    ev.preventDefault();
  }
});

/* Reset hidden fields on 'clear' */
$( 'input#clearForm' ).click(function() { $( 'input[type="hidden"]' ).val(""); });

/* Select row for editing */
$( 'tr.tableRow' ).click(function() {
  $( 'input#'+$(this).attr('data-key') ).val( $(this).attr('data-val') );

  $(this).children('td').each(function() {
    var key = '#'+$(this).attr('data-key');
    if (key === '#password' || key === '#confirm') { return false; }
    if (key !== '#access') {
      return $( key ).val($(this).text());
    }

    $( 'input.accessChecks' ).prop('checked', false);

    $(this).text().split('/').forEach(function(accessType) {
      $( 'input#'+accessType ).prop('checked', true);
    });

  });
});

/* Auto-select checks */
$( 'input.accessChecks' ).change(function() {
  if (!$(this).prop('checked')) return;

  if ($(this).attr('id') === "none") {
    $( 'input.accessChecks' ).not( '#none' ).prop('checked', false);
  } else {
    $( 'input#none' ).prop('checked', false);
  }
});

/* Require username to do anything */
$(function() { $( 'input#username' ).attr('required', true); })

/* Update password/confirm fields on each change */
$( 'input#confirm, input#password' ).on('input', function() {
  var confirm = $( 'input#confirm' );
  var confirmVal = confirm.val();
  var pwordVal = $( 'input#password' ).val();

  confirm.attr('required', !!pwordVal);
  
  if (!confirmVal || confirmVal === pwordVal) {
    return confirm.removeClass('invalid');
  }
  confirm.addClass('invalid');
});

/* Regenerate API ID */
$( '#actionRegen' ).click(function() {
  var idElem = $( '#primary-key input' );
  var idVal = idElem.val();
  if (!idVal) return window.alert('Select a row to update...');

  var sendData = {};
  sendData[idElem.attr('id')] = idVal;

  $.ajax({
    type:    "POST",
    url:     $( 'form#editForm' ).attr('action').replace('/form', '/regenToken'),
    data:    sendData,
    success: function(data) {
        if (!data.success) { window.alert('Error regenerating API ID: '+(data.error || 'Unknown error')); }
        else { window.location.reload(); }
      },
    error:   function(jqXHR, textStatus, errorThrown) {
        window.alert("Error regenerating API ID!\n" + (
          jqXHR.responseJSON.error || errorThrown + " [" + textStatus + "]"
        ));
    }
  });
});