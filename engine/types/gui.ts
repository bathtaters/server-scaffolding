import type { ValidationBase } from "./validate.d"

/** Enum of form actions { actionType: "Button Label" } */
export const actions = {
    // GUI Action: GUI Button Label
    find: 'Search',
    create: 'Add',
    update: 'Update',
    delete: 'Remove',
    clear: 'Reset',
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

const htmlFromValidation: Partial<Record<ValidationBase, typeof htmlTypes[keyof typeof htmlTypes]>> = {
    int:      htmlTypes.number,
    float:    htmlTypes.number,
    boolean:  htmlTypes.checkbox,
    date:     htmlTypes.date,
    datetime: htmlTypes.datetime,
} as const

/** Convert validation type to HTML type { validationType: "htmlType", default: "htmlType" } */
export const htmlValidationDict = {
    ...htmlFromValidation,
    default:  htmlTypes.text,
} as const