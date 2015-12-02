require('../client');
require('./partials/navbar');

api.branches(req.params.user, req.params.repo, function(branches) {
    $('.page-content').html(
        _.div({class: 'container'},
            _.each(
                branches,
                function(i, branch) {
                    i = parseInt(i);

                    function onClickMergeUp() {
                        api.merge(req.params.user, req.params.repo, branches[i].name, branches[i+1].name, function(merge) {
                            console.log(merge);
                        });
                    }

                    function onClickMergeDown() {
                        api.merge(req.params.user, req.params.repo, branches[i+1].name, branches[i].name, function(merge) {
                            console.log(merge);
                        });
                    }

                    var $branch = _.div({class: 'panel panel-primary'}, [
                        _.div({class: 'panel-heading'}, 
                            _.h4({class: 'panel-title text-center'},
                                branch.name
                            )
                        ),
                        _.div({class: 'panel-body'},
                            _.div({class: 'row'}, [
                                _.div({class: 'col-md-6'},
                                    _.div({class: 'panel panel-default'}, [
                                        _.div({class: 'panel-heading'},
                                            _.h4({class: 'panel-title'},
                                                'updated at ' + helper.formatDate(branch.updated.date) + ' by <a href="mailto:' + branch.updated.email + '">' + branch.updated.name + '</a>'
                                            )
                                        ),
                                        _.div({class: 'panel-body'},
                                            branch.updated.message
                                        )
                                    ])
                                ),
                                _.div({class: 'col-md-6'},
                                    _.div({class: 'btn-group'}, [
                                        _.a({class: 'btn btn-default', href: '/repos/' + req.params.repo + '/stage/cms/'},
                                            'Go to CMS'
                                        ),
                                        _.a({class: 'btn btn-default', href: '/repos/' + req.params.repo + '/stage/'},
                                            'Go to website'
                                       )
                                    ])
                                )
                            ])
                        )
                    ]);

                    var $actions = _.div({class: 'repo-actions'},
                        _.div({class: 'btn-group'}, [
                            _.button({class: 'btn btn-lg btn-primary'},
                                _.span({class: 'glyphicon glyphicon-download'})
                            ).click(onClickMergeDown),
                            _.button({class: 'btn btn-lg btn-primary'},
                                _.span({class: 'glyphicon glyphicon-upload'})
                            ).click(onClickMergeUp)
                        ])
                    );


                    // Set relevant diff data
                    if(i < branches.length - 1) {
                        api.compare(req.params.user, req.params.repo, branches[i].name, branches[i+1].name, function(compare) {
                            console.log(compare.aheadBy)
                        });
                    }


                    return [
                        $branch,
                        i < branches.length - 1 ? $actions : null
                    ];
                }
            )
        )
    ); 
});
