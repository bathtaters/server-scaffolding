/** Enum of form actions { actionType: "Button Label" } */
export const actions = {
    // GUI Action: GUI Button Label
    find: 'Search',
    create: 'Add',
    update: 'Update',
    delete: 'Remove',
    clear: 'Reset',
} as const

/** Meta fields in Form */
export const metaField = {
    button: '_action',
    csrf:   '_csrf', // NOTE: THIS MUST ALSO BE UPDATED IN model/profile/users CLIENT JS (update var 'CSRF') //
    page:   '_pageData',
    search: '_searchMode', // NOTE: THIS MUST ALSO BE UPDATED IN model/users CLIENT JS (update var 'IS_SEARCH') //
} as const

/** Effects for Form Display */
export const formEffects = {
    /** Doesn't appear in form at all */
    ignore: 'ignore',
    /** Gets saved/submitted in background, but is not displayed */
    hidden: 'hidden',
    /** Displays but is locked from editing */
    readonly: 'readonly',
    /** Don't show default value in form, but still uses it if field is blank */
    hideDefault: 'hideDefault',
} as const

/** Meta fields in Form */
export const formData = {
    /** Button clicked */
    [metaField.button]: { type: 'string',   limits: { max: 16 } },
    /** CSRF Token */
    [metaField.csrf]:   { type: 'string?',  limits: { max: 64 } },
    /** Page Select Object (See pageSelect) */
    [metaField.page]:   { type: 'object?',  limits: { max: 32 } },
    /** Is searchMode enabled */
    [metaField.search]: { type: 'boolean?' },
} as const
  
/** Additional fields for GUI pagination */
export const pageSelect = {
    /** Page number */
    page: { type: 'int?',    limits: { min: 1 } },
    /** Size of page */
    size: { type: 'int?',    limits: { min: 1 } },
    /** Key to sort by */
    sort: { type: 'string?'  },
    /** Sort data descending? */
    desc: { type: 'boolean?' },
} as const

/** Enum of HTML Input Types (These are passed to form.mixins.pug) */
export const htmlTypes = {
    /* Special Inputs */
    id: "id", /* Uses type="number" */
    readonly: "readonly", /* Uses type="text" */
    hidden: "hidden",
    file: "file",
    
    /* String Inputs */
    text: "text",
    password: "password",
    email: "email",
    tel: "tel",
    url: "url",
    color: "color",
    search: "search",
    
    /* Numeric Inputs */
    number: "number",
    range: "range",
    
    /* Multi-Select Inputs */
    checkbox: "checkbox",
    radio: "radio",
    option: "option", /* Uses <option/select> */
    
    /* Date Inputs */
    date: "date",
    datetime: "datetime-local",
    month: "month",
    week: "week",
    time: "time",
    
    /* Button Inputs [Disabled] */
    // button: "button",
    // submit: "submit",
    // image: "image",
    // reset: "reset",
} as const

const htmlFromValidation /*: Partial<Record<ValidationBase, typeof htmlTypes[keyof typeof htmlTypes]>> */ = {
    int:      htmlTypes.number,
    float:    htmlTypes.number,
    boolean:  htmlTypes.checkbox,
    date:     htmlTypes.date,
    datetime: htmlTypes.datetime,
} as const

/** Convert validation type to HTML type { validationType: "htmlType", default: "htmlType" } */
export const htmlValidationDict = {
    ...htmlFromValidation,
    array:    htmlTypes.text,
    default:  htmlTypes.text,
} as const