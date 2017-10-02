'use strict';

const FieldEditor = require('./FieldEditor');

/**
 * An editor for content URLs
 *
 * @description Example:
 * <pre>
 * {
 *     "myUrl": {
 *         "label": "My URL",
 *         "tabId": "content",
 *         "schemaId": "url"
 *     }
 * }
 * </pre>
 *
 * @memberof HashBrown.Client.Views.Editors.FieldEditors
 */
class UrlEditor extends FieldEditor {
    constructor(params) {
        super(params);

        this.init();
    }

    /**
     * Get all parent content nodes
     *
     * @param {String} contentId
     *
     * @return {Array} nodes
     */
    static getAllParents(contentId) {
        let nodes = [];    
        let contentEditor = Crisp.View.get('ContentEditor');

        function iterate(id) {
            let node;
        
            node = window.resources.content.filter((node) => {
                return node.id == id;
            })[0];

            if(node) {
                nodes.push(node);

                if(node.parentId) {
                    iterate(node.parentId);
                }

            } else {
                debug.log('Content not found: "' + id + '"', this);
            }
        }

        iterate(contentId);

        nodes.reverse();

        return nodes;
    }

    /**
     * Generates a new url based on content id
     *
     * @param {String} contentId
     *
     * @return {String} url
     */
    generateUrl(contentId) {
        let nodes = UrlEditor.getAllParents(contentId);
        let url = '/';
       
        if(this.multilingual) {
            url += window.language + '/';
        }

        for(let node of nodes) {
            let title = '';
       
            if(node.id == Crisp.Router.params.id) {
                title = $('.editor__field[data-key="title"] .editor__field__value input').val();

            } else {
                // If title is set directly (unlikely), pass it
                if(typeof node.title === 'string') {
                    title = node.title;

                // If title is defined in properties (typical)
                } else if(node.properties && node.properties.title) {
                    // If title is multilingual
                    if(node.properties.title[window.language]) {
                        title = node.properties.title[window.language];
                    
                    // If title is not multilingual
                    } else if(typeof node.properties.title === 'string') {
                        title = node.properties.title;
                    
                    }
                }
            }

            url += HashBrown.Helpers.ContentHelper.getSlug(title) + '/';
        }

        let sameUrls = 0;

        for(let content of window.resources.content) {
            if(content.id != contentId) {
                let thatUrl = content.prop('url', window.language);
                let isMatchWithNumber = new RegExp(url.substring(0, url.lastIndexOf('/')) + '-[0-9]+/').test(thatUrl);
                let isSameUrl = url == thatUrl || isMatchWithNumber;

                if(isSameUrl) {
                    sameUrls++;
                }
            }
        }

        if(sameUrls > 0) {
            let message = sameUrls;
           
            if(sameUrls == 1) {
                message += ' content node has ';
            } else {
                message += ' content nodes have ';
            }

            message += 'the same URL "' + url + '". Appending "-' + sameUrls + '".';

            UI.messageModal('Duplicate URLs', message);

            url = url.replace(/\/$/, '-' + sameUrls + '/');
        }

        return url;
    }

    /**
     * Regenerates the URL
     */
    regenerate() {
        let newUrl = this.generateUrl(Crisp.Router.params.id);

        this.$input.val(newUrl);

        this.trigger('silentchange', this.$input.val());
    };

    /**
     * Fetch the URL from the Content title
     */
    fetchFromTitle() {
        this.value = this.$titleField.val();

        this.regenerate();
    }

    /**
     * Event: Change value
     */
    onChange() {
        this.value = this.$input.val();

        if(this.value.length > 0) {
            if(this.value[0] != '/') {
                this.value = '/' + this.value;
                this.$input.val(this.value);
            }
            
            if(this.value.length > 1 && this.value[this.value.length - 1] != '/') {
                this.value = this.value + '/';
                this.$input.val(this.value);
            }
        } else {
            this.fetchFromTitle();
        }

        this.trigger('change', this.value);
    };

    /**
     * Renders this editor
     */
    template() {
        return _.div({class: 'editor__field__value'},
            this.renderPreview(),

            _.div({class: 'widget-group'},
                this.$input = _.input({class: 'widget widget--input text', type: 'text', value: this.value})
                    .on('change', () => { this.onChange(); }),
                _.button({class: 'widget widget--button small fa fa-refresh', title: 'Regenerate URL'})
                    .click(() => { this.regenerate(); })
            )
        );

        //  Wait for next CPU cycle to check for title field
        setTimeout(() => {
            this.$titleField = this.$element.parents('.tab-pane').find('.field-container[data-key="title"]').eq(0);

            if(this.$titleField.length == 1) {
                this.$titleField.change(() => {
                    this.fetchFromTitle();   
                });
            }

            if(!this.value) {
                this.fetchFromTitle();
            }
        }, 2);
    }
}

module.exports = UrlEditor;