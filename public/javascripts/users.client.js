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
  $( 'input#id' ).val( $(this).attr('id') );

  $(this).children('td').each(function() {
    var key = '#'+$(this).attr('data-key');
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

/* Regenerate API ID */
$( '#actionRegen' ).click(function() {
  var apiId = $( 'input#id' ).val();
  if (!apiId) return window.alert('Select a row to update...');
  $.ajax({
    type:    "POST",
    url:     $( 'form#editForm' ).attr('action').replace('/form', '/regenToken'),
    data:    { id: apiId },
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