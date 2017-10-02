'use strict';

const Content = require('Client/Models/Content');

const FieldEditor = require('./FieldEditor');

/**
 * An editor for referring to other Content
 *
 * @description Example:
 * <pre>
 * {
 *     "myContentReference": {
 *         "label": "My content reference",
 *         "tabId": "content",
 *         "schemaId": "contentReference",
 *         "config": {
 *            "allowedSchemas": [ "page", "myCustomSchema" ]
 *         }
 *     }
 * }
 * </pre>
 *
 * @memberof HashBrown.Client.Views.Editors.FieldEditors
 */
class ContentReferenceEditor extends FieldEditor {
    constructor(params) {
        super(params);

        this.init();
    }

    /**
     * Event: Change value
     */
    onChange(newValue) {
        this.value = newValue;

        this.trigger('change', this.value);
    }

    /**
     * Gets a list of allowed Content options
     *
     * @returns {Array} List of options
     */
    getDropdownOptions() {
        let allowedContent = [];
        let areRulesDefined = this.config && Array.isArray(this.config.allowedSchemas) && this.config.allowedSchemas.length > 0;

        for(let content of resources.content) {
            if(areRulesDefined) {
                let isContentAllowed = this.config.allowedSchemas.indexOf(content.schemaId) > -1;
                
                if(!isContentAllowed) { continue; }
            }

            allowedContent[allowedContent.length] = {
                label: content.prop('title', window.language),
                value: content.id,
                selected: content.id == this.value
            };
        }

        return allowedContent;
    }

    /**
     * Renders the config editor
     *
     * @param {Object} config
     *
     * @returns {HTMLElement} Element
     */
    static renderConfigEditor(config) {
        config.allowedSchemas = config.allowedSchemas || [];
        
        return _.div({class: 'editor__field'},
            _.div({class: 'editor__field__key'}, 'Allowed Schemas'),
            _.div({class: 'editor__field__value'},
                new HashBrown.Views.Widgets.Dropdown({
                    options: HashBrown.Helpers.SchemaHelper.getAllSchemasSync('content'),
                    useMultiple: true,
                    useClearButton: true,
                    valueKey: 'id',
                    labelKey: 'name',
                    onChange: (newValue) => {
                        config.allowedSchemas = newValue;
                    }
                }).$element
            )
        );
    }

    /**
     * Render this editor
     */
    render() {
        // Render main element
        this.$element = _.div({class: 'field-editor content-reference-editor'}, [
            // Render preview
            this.renderPreview(),

            // Render picker
            this.$dropdown = UI.inputDropdownTypeAhead('(none)', this.getDropdownOptions(), (newValue) => {
                this.onChange(newValue);             
            }, true)
        ]);
    }
}

module.exports = ContentReferenceEditor;