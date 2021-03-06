'use strict';

/**
 * The Content navbar pane
 * 
 * @memberof HashBrown.Client.Views.Navigation
 */
class ContentPane extends HashBrown.Views.Navigation.NavbarPane {
    /**
     * Event: Change parent
     */
    static onChangeDirectory(id, parentId) {
        if(parentId == '/') {
            parentId = '';
        }

        // Get the Content model
        HashBrown.Helpers.ContentHelper.getContentById(id)

        // API call to apply changes to Content parent
        .then((content) => {
            content.parentId = parentId;
         
            return HashBrown.Helpers.RequestHelper.request('post', 'content/' + id, content);
        })

        // Reload all Content models
        .then(() => {
            return HashBrown.Helpers.RequestHelper.reloadResource('content');
        })

        // Reload UI
        .then(() => {
            HashBrown.Views.Navigation.NavbarMain.reload();
        })
        .catch(UI.errorModal);
    }

    /**
     * Event: Change sort index
     */
    static onChangeSortIndex(id, newIndex, parentId) {
        if(parentId == '/') {
            parentId = '';
        }
        
        // Get the Content model
        HashBrown.Helpers.ContentHelper.getContentById(id)

        // API call to apply changes to Content parent
        .then((content) => {
            content.sort = newIndex;
            content.parentId = parentId;
         
            return HashBrown.Helpers.RequestHelper.request('post', 'content/' + id, content);
        })

        // Reload all Content models
        .then(() => {
            return HashBrown.Helpers.RequestHelper.reloadResource('content');
        })

        // Reload UI
        .then(() => {
            HashBrown.Views.Navigation.NavbarMain.reload();
        })
        .catch(UI.errorModal);
    }

    /**
     * Event: Click pull content
     */
    static onClickPullContent() {
        let contentEditor = Crisp.View.get('ContentEditor');
        let pullId = $('.context-menu-target').data('id');

        // API call to pull the Content by id
        HashBrown.Helpers.RequestHelper.request('post', 'content/pull/' + pullId, {})
        
        // Upon success, reload all Content models    
        .then(() => {
            return HashBrown.Helpers.RequestHelper.reloadResource('content');
        })

        // Reload the UI
        .then(() => {
            HashBrown.Views.Navigation.NavbarMain.reload();

			location.hash = '/content/' + pullId;
		
			let editor = Crisp.View.get('ContentEditor');

			if(editor && editor.model && editor.model.id == pullId) {
                editor.model = null;
				editor.fetch();
			}
        }) 
        .catch(UI.errorModal);
    }
    
    /**
     * Event: Click push content
     */
    static onClickPushContent() {
		let $element = $('.context-menu-target');
        let pushId = $element.data('id');

		$element.parent().addClass('loading');

        // API call to push the Content by id
        HashBrown.Helpers.RequestHelper.request('post', 'content/push/' + pushId)

        // Upon success, reload all Content models
        .then(() => {
            return HashBrown.Helpers.RequestHelper.reloadResource('content');
        })

        // Reload the UI
        .then(() => {
            HashBrown.Views.Navigation.NavbarMain.reload();
        }) 
        .catch(UI.errorModal);
    }

    /**
     * Event: Click new content
     *
     * @param {String} parentId
     */
    static onClickNewContent(parentId, asSibling) {
        // Try to get a parent Schema if it exists
        return function getParentSchema() {
            if(parentId) {
                return HashBrown.Helpers.ContentHelper.getContentById(parentId)
                .then((parentContent) => {
                    return HashBrown.Helpers.SchemaHelper.getSchemaById(parentContent.schemaId);
                });
            } else {
                return Promise.resolve();
            }
        }()

        // Parent Schema logic resolved, move on
        .then((parentSchema) => {
            let allowedSchemas = parentSchema ? parentSchema.allowedChildSchemas : null;

            // If allowed child Schemas were found, but none were provided, don't create the Content node
            if(allowedSchemas && allowedSchemas.length < 1) {
                return Promise.reject(new Error('No child content schemas are allowed under this parent'));
            
            // Some child Schemas were provided, or no restrictions were defined
            } else {
                let schemaId;
                let sortIndex = HashBrown.Helpers.ContentHelper.getNewSortIndex(parentId);
              
                // Instatiate a new Content Schema reference editor
                let schemaReference = new HashBrown.Views.Editors.FieldEditors.ContentSchemaReferenceEditor({
                    config: {
                        allowedSchemas: allowedSchemas,
                        parentSchema: parentSchema
                    }
                });

                schemaReference.on('change', (newValue) => {
                    schemaId = newValue;
                });

                schemaReference.pickFirstSchema();

                schemaReference.$element.addClass('widget');

                // Render the confirmation modal
                UI.confirmModal(
                    'OK',
                    'Create new content',
                    _.div({class: 'widget-group'},
                        _.label({class: 'widget widget--label'},'Schema'),
                        schemaReference.$element
                    ),

                    // Event fired when clicking "OK"
                    () => {
                        if(!schemaId) { return false; }
                       
                        let apiUrl = 'content/new/' + schemaId + '?sort=' + sortIndex;

                        let newContent;

                        // Append parent Content id to request URL
                        if(parentId) {
                            apiUrl += '&parent=' + parentId;
                        }

                        // API call to create new Content node
                        HashBrown.Helpers.RequestHelper.request('post', apiUrl)
                        
                        // Upon success, reload resource and UI elements    
                        .then((result) => {
                            newContent = result;

                            return HashBrown.Helpers.RequestHelper.reloadResource('content');
                        })
                        .then(() => {
                            HashBrown.Views.Navigation.NavbarMain.reload();
                            
                            location.hash = '/content/' + newContent.id;
                        })
                        .catch(UI.errorModal);
                    }
                );
            }
        })
        .catch(UI.errorModal);
    }

    /**
     * Render Content publishing modal
     *
     * @param {Content} content
     */
    static renderPublishingModal(content) {
        let modal = new HashBrown.Views.Modals.PublishingSettingsModal({
            model: content
        });

        modal.on('change', (newValue) => {
            if(newValue.governedBy) { return; }
           
            // Commit publishing settings to Content model
            content.settings.publishing = newValue;
    
            // API call to save the Content model
            HashBrown.Helpers.RequestHelper.request('post', 'content/' + content.id, content)
            
            // Upon success, reload the UI    
            .then(() => {
                HashBrown.Views.Navigation.NavbarMain.reload();

                if(Crisp.Router.params.id == content.id) {
                    let contentEditor = Crisp.View.get('ContentEditor');

                    contentEditor.model = content;
                    return contentEditor.fetch();
                
                } else {
                    return Promise.resolve();

                }
            })
            .catch(UI.errorModal);
        });
    }

    /**
     * Event: Click Content settings
     */
    static onClickContentPublishing() {
        let id = $('.context-menu-target').data('id');

        // Get Content model
        let content = HashBrown.Helpers.ContentHelper.getContentByIdSync(id);

        this.renderPublishingModal(content);
    }

    /**
     * Event: Click remove content
     *
     * @param {Boolean} shouldUnpublish
     */
    static onClickRemoveContent(shouldUnpublish) {
        let $element = $('.context-menu-target'); 
        let id = $element.data('id');
        let name = $element.data('name');
    
        HashBrown.Helpers.ContentHelper.getContentById(id)
        .then((content) => {
            content.settingsSanityCheck('publishing');

            function unpublishConnection() {
                return HashBrown.Helpers.RequestHelper.request('post', 'content/unpublish', content)
                .then(() => {
                    return onSuccess();
                });
            }
            
            function onSuccess() {
                return HashBrown.Helpers.RequestHelper.reloadResource('content')
                .then(() => {
                    HashBrown.Views.Navigation.NavbarMain.reload();
                            
                    let contentEditor = Crisp.View.get('ContentEditor');
                   
                    // Change the ContentEditor view if it was displaying the deleted content
                    if(contentEditor && contentEditor.model && contentEditor.model.id == id) {
                        // The Content was actually deleted
                        if(shouldUnpublish) {
                            location.hash = '/content/';
                        
                        // The Content still has a synced remote
                        } else {
                            contentEditor.model = null;
                            contentEditor.fetch();

                        }
                    }
                    
                    $element.parent().toggleClass('loading', false);

                    return Promise.resolve();
                });
            }

            let shouldDeleteChildren = false;
            
            UI.confirmModal(
                'Remove',
                'Remove the content "' + name + '"?',
                _.div({class: 'widget-group'},
                    _.label({class: 'widget widget--label'}, 'Remove child Content too'),
                    new HashBrown.Views.Widgets.Input({
                        value: shouldDeleteChildren,
                        type: 'checkbox',
                        onChange: (newValue) => {
                            shouldDeleteChildren = newValue;
                        }
                    }).$element
                ),
                () => {
                    $element.parent().toggleClass('loading', true);

                    HashBrown.Helpers.RequestHelper.request('delete', 'content/' + id + '?removeChildren=' + shouldDeleteChildren)
                    .then(() => {
                        if(shouldUnpublish && content.getSettings('publishing').connectionId) {
                            return unpublishConnection();
                        } else {
                            return onSuccess();
                        }
                    })
                    .catch((e) => {
                        $element.parent().toggleClass('loading', false);
                        UI.errorModal(e);
                    });
                }
            );
        });
    }

    /**
     * Event: Click rename
     */
    static onClickRename() {
        let id = $('.context-menu-target').data('id');
        let content = HashBrown.Helpers.ContentHelper.getContentByIdSync(id);

        UI.messageModal(
            'Rename "' + content.getPropertyValue('title', window.language) + '"', 
            _.div({class: 'widget-group'}, 
                _.label({class: 'widget widget--label'}, 'New name'),
                new HashBrown.Views.Widgets.Input({
                    value: content.getPropertyValue('title', window.language), 
                    onChange: (newValue) => {
                        content.setPropertyValue('title', newValue, window.language);
                    }
                })
            ),
            () => {
                HashBrown.Helpers.ContentHelper.setContentById(id, content)
                .then(() => {
                    return HashBrown.Helpers.RequestHelper.reloadResource('content');
                })
                .then(() => {
                    HashBrown.Views.Navigation.NavbarMain.reload();

                    // Update ContentEditor if needed
                    let contentEditor = Crisp.View.get('ContentEditor');

                    if(!contentEditor || contentEditor.model.id !== id) { return; }

                    contentEditor.model = null;
                    contentEditor.fetch();
                })
                .catch(UI.errorModal);
            }
        );
    }

    /**
     * Init
     */
    static init() {
        HashBrown.Views.Navigation.NavbarMain.addTabPane('/content/', 'Content', 'file', {
            getItems: () => { return resources.content; },

            // Item context menu
            getItemContextMenu: (item) => {
                let menu = {};
                let isSyncEnabled = HashBrown.Helpers.SettingsHelper.getCachedSettings(HashBrown.Helpers.ProjectHelper.currentProject, null, 'sync').enabled;
                
                menu['This content'] = '---';
                
                menu['Open in new tab'] = () => { this.onClickOpenInNewTab(); };
                
                menu['Rename'] = () => { this.onClickRename(); };

                menu['New child content'] = () => {
                    this.onClickNewContent($('.context-menu-target').data('id'));
                };
                                
                if(!item.sync.isRemote && !item.isLocked) {
                    menu['Move'] = () => { this.onClickMoveItem(); };
                }

                if(!item.sync.hasRemote && !item.isLocked) {
                    menu['Remove'] = () => { this.onClickRemoveContent(true); };
                }
                
                menu['Copy id'] = () => { this.onClickCopyItemId(); };
                
                if(!item.sync.isRemote && !item.isLocked) {
                    menu['Settings'] = '---';
                    menu['Publishing'] = () => { this.onClickContentPublishing(); };
                }
                
                if(item.isLocked && !item.sync.isRemote) { isSyncEnabled = false; }
               
                if(isSyncEnabled) {
                    menu['Sync'] = '---';
                    
                    if(!item.sync.isRemote) {
                        menu['Push to remote'] = () => { this.onClickPushContent(); };
                    }

                    if(item.sync.hasRemote) {
                        menu['Remove local copy'] = () => { this.onClickRemoveContent(); };
                    }
                    
                    if(item.sync.isRemote) {
                        menu['Pull from remote'] = () => { this.onClickPullContent(); };
                    }
                }

                menu['General'] = '---';
                menu['New content'] = () => { this.onClickNewContent(); };  
                menu['Refresh'] = () => { this.onClickRefreshResource('content'); };

                return menu;
            },

            // Set general context menu items
            paneContextMenu: {
                'Content': '---',
                'New content': () => { this.onClickNewContent(); },
                'Refresh': () => { this.onClickRefreshResource('content'); }
            },

            // Hierarchy logic
            hierarchy: function(item, queueItem) {
                // Set id data attributes
                queueItem.$element.attr('data-content-id', item.id);
                queueItem.parentDirAttr = {'data-content-id': item.parentId };
            }
        });
    }
}

module.exports = ContentPane;
