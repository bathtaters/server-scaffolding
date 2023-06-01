/// <reference path="./jquery-3.6.0.min.js" />

$(function () {
    // Load FormKeys
    var formKeys = $('input#_formKeys').val();

    if (!formKeys) {
        console.error(
            'Missing _formKeys object: '+
            'This is included in the generic container.pug, '+
            'without it some UI actions may fail.'
        );
        return;
    }

    formKeys = Object.freeze(JSON.parse(formKeys));

    Object.defineProperty(window, 'LOCALS', {
        get: function() {
            return {
                formKeys: formKeys,
            };
        }
    });
});