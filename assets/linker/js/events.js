// Init events for container
var initContainer = {
    users: false,
    projects: false,
    types: false,
    phases: false
};

// Init events for container
var initNavigation = {
    users: false,
    projects: false
};

jQuery(document).ready(function() {
    var body = jQuery('body');

    /**
     * Event to check if all initialize methods are done. If all necessary init methods
     * are executed event trigger will un-hide specified dom elements.
     *
     * @param   {Event}     event       Current event object
     * @param   {String}    initMethod  Initialize event name
     */
    body.on('initializeCheck', function(event, initMethod) {
        var initContainerDone = true;
        var initNavigationDone = true;

        initMethod = initMethod || false;

        // Change init event state to done
        if (initMethod !== false) {
            initContainer[initMethod] = true;
            initNavigation[initMethod] = true;
        }

        // Iterate init event states
        jQuery.each(initContainer, function(key, value) {
            // All not yet done.
            if (value === false) {
                initContainerDone = false;
            }
        });

        // Iterate init event states
        jQuery.each(initNavigation, function(key, value) {
            // All not yet done.
            if (value === false) {
                initNavigationDone = false;
            }
        });

        if (initContainerDone) {
            jQuery('#boardContent').show();
        } else {
            jQuery('#boardContent').hide();
        }

        if (initNavigationDone) {
            jQuery('#navigation').show();
        } else {
            jQuery('#navigation').hide();
        }
    });

    // Task open event
    body.on('dblclick', '.task', function() {
        var data = ko.dataFor(this);

        body.trigger('taskEdit', [data]);
    });

    // Story open event
    body.on('dblclick', '.story', function() {
        var data = ko.dataFor(this);

        body.trigger('storyEdit', [data.id()]);
    });

    // Help click event
    jQuery('#functionHelp').on('click', 'a', function() {
        var title = "Generic help";

        // create bootbox modal
        var modal = createBootboxDialog(title, JST["assets/linker/templates/help_generic.html"](), null, false);

        // Add help class and show help modal
        modal.addClass('modalHelp');
        modal.modal('show');
    });

    /**
     * Task add event, this opens a modal bootbox dialog with task add
     * form on it.
     *
     * Note that this event requires knockout story model in parameters.
     */
    body.on('taskAdd', function(event, story) {
        jQuery.get('/Task/add', {projectId: story.projectId(), storyId: story.id()}, function(content) {
            var title = "Add new task to story '" + ko.toJS(story.title()) + "'";
            var buttons = [
                {
                    label: "Save",
                    className: "btn-primary pull-right",
                    callback: function () {
                        var form = jQuery('#formTaskNew', modal);
                        var formItems = form.serializeJSON();

                        // Validate current form items and try to create new task
                        if (validateForm(formItems, modal)) {
                            // Create new task
                            socket.post('/Task', formItems, function(/** sails.json.task */data) {
                                if (handleSocketError(data)) {
                                    makeMessage('Task created successfully.', 'success', {});

                                    modal.modal('hide');

                                    // Update client bindings
                                    myViewModel.tasks.push(new Task(data));
                                }
                            });
                        }

                        return false;
                    }
                }
            ];

            // Create bootbox modal
            var modal = createBootboxDialog(title, content, buttons, false);

            // Make form init when dialog is opened.
            modal.on('shown.bs.modal', function() {
                initTaskForm(modal, false);
            });

            // Open bootbox modal
            modal.modal('show');
        })
        .fail(function(jqXhr, textStatus, error) {
            handleAjaxError(jqXhr, textStatus, error);
        });
    });

    /**
     * Task edit event, this opens a modal bootbox dialog with task edit
     * form on it.
     */
    body.on('taskEdit', function(event, task) {
        jQuery.get('/Task/edit', {id: task.id()}, function(content) {
            var title = "Edit task";
            var buttons = [
                {
                    label: "Save",
                    className: "btn-primary pull-right",
                    callback: function() {
                        var form = jQuery('#formTaskEdit', modal);
                        var formItems = form.serializeJSON();

                        // Validate current form items and try to update task data
                        if (validateForm(formItems, modal)) {
                            // Update task data
                            socket.put('/Task/'  + task.id(), formItems, function(/** sails.json.task */data) {
                                if (handleSocketError(data)) {
                                    makeMessage("Task updated successfully.", "success", {});

                                    modal.modal('hide');

                                    // Update client bindings
                                    var task = _.find(myViewModel.tasks(), function(task) {
                                        return task.id() === data.id;
                                    });

                                    if (typeof task !== 'undefined') {
                                        myViewModel.tasks.replace(task, new Task(data));
                                    }
                                }
                            });
                        }

                        return false;
                    }
                },
                {
                    label: "Delete",
                    className: "btn-danger pull-right",
                    callback: function() {
                        bootbox.confirm({
                            title: 'danger - danger - danger',
                            message: 'Are you sure of task delete?',
                            buttons: {
                                'cancel': {
                                    className: 'btn-default pull-left'
                                },
                                'confirm': {
                                    label: 'Delete',
                                    className: 'btn-danger pull-right'
                                }
                            },
                            callback: function(result) {
                                if (result) {
                                    // Delete task data
                                    socket.delete('/Task/' + task.id(), function(data) {
                                        if (handleSocketError(data)) {
                                            makeMessage("Task deleted successfully.", "success", {});

                                            var task = _.find(myViewModel.tasks(), function(task) {
                                                return task.id() === data.id;
                                            });

                                            if (typeof task !== 'undefined') {
                                                myViewModel.tasks.remove(task);
                                            }
                                        }
                                    });
                                } else {
                                    body.trigger('taskEdit', [task]);
                                }
                            }
                        });
                    }
                }
            ];

            // Create bootbox modal
            var modal = createBootboxDialog(title, content, buttons, false);

            // Make form init when dialog is opened.
            modal.on('shown.bs.modal', function() {
                initTaskForm(modal, true);
            });

            // Open bootbox modal
            modal.modal('show');
        })
        .fail(function(jqXhr, textStatus, error) {
            handleAjaxError(jqXhr, textStatus, error);
        });
    });

    /**
     * Milestone add event. This opens a modal dialog with milestone add form.
     */
    body.on('milestoneAdd', function(event, projectId, trigger) {
        trigger = trigger || {};

        jQuery.get('/Milestone/add', {projectId: projectId}, function(content) {
            var title = "Add new milestone";
            var buttons = [
                {
                    label: "Save",
                    className: "btn-primary pull-right",
                    callback: function () {
                        var form = jQuery('#formMilestoneNew', modal);
                        var formItems = form.serializeJSON();

                        // Validate current form items and try to create new task
                        if (validateForm(formItems, modal)) {
                            jQuery.ajax({
                                type: 'POST',
                                url: "/Milestone/",
                                data: formItems,
                                dataType: 'json'
                            })
                            .done(function(/** models.rest.milestone */milestone) {
                                makeMessage("Milestone created successfully.", "success", {});

                                modal.modal('hide');

                                handleEventTrigger(trigger);
                            })
                            .fail(function(jqXhr, textStatus, error) {
                                handleAjaxError(jqXhr, textStatus, error);
                            });
                        }

                        return false;
                    }
                }
            ];

            // Create bootbox modal
            var modal = createBootboxDialog(title, content, buttons, trigger);

            // Make form init when dialog is opened.
            modal.on('shown.bs.modal', function() {
                initMilestoneForm(modal, false);
            });

            // Open bootbox modal
            modal.modal('show');
        })
        .fail(function(jqXhr, textStatus, error) {
            handleAjaxError(jqXhr, textStatus, error);
        });
    });

    body.on('milestoneEdit', function(event, milestoneId, trigger) {
        if (typeof trigger === 'undefined') {
            trigger = {
                trigger: 'projectMilestones',
                parameters: [myViewModel.project().id()]
            };
        }

        jQuery.get('/Milestone/edit', {id: milestoneId}, function(content) {
            var title = "Edit milestone";
            var buttons = [
                {
                    label: "Save",
                    className: "btn-primary pull-right",
                    callback: function() {
                        var form = jQuery('#formMilestoneEdit', modal);
                        var formItems = form.serializeJSON();

                        // Validate current form items and try to update milestone data
                        if (validateForm(formItems, modal)) {
                            jQuery.ajax({
                                type: "PUT",
                                url: "/Milestone/" + milestoneId,
                                data: formItems,
                                dataType: 'json'
                            })
                            .done(function(/** models.rest.milestone */milestone) {
                                makeMessage("Milestone updated successfully.", "success", {});

                                modal.modal('hide');

                                handleEventTrigger(trigger);
                            })
                            .fail(function(jqXhr, textStatus, error) {
                                handleAjaxError(jqXhr, textStatus, error);
                            });
                        }

                        return false;
                    }
                },
                {
                    label: "Delete",
                    className: "btn-danger pull-right",
                    callback: function() {
                        modal.modal('hide');

                        bootbox.confirm({
                            title: 'danger - danger - danger',
                            message: 'Are you sure of milesone delete?',
                            buttons: {
                                'cancel': {
                                    className: 'btn-default pull-left'
                                },
                                'confirm': {
                                    label: 'Delete',
                                    className: 'btn-danger pull-right'
                                }
                            },
                            callback: function(result) {
                                if (result) {
                                    jQuery.ajax({
                                        type: "DELETE",
                                        url: "/milestone/" + milestoneId,
                                        dataType: 'json'
                                    })
                                    .done(function() {
                                        makeMessage("Milestone deleted successfully.", "success", {});

                                        handleEventTrigger(trigger);
                                    })
                                    .fail(function(jqXhr, textStatus, error) {
                                        handleAjaxError(jqXhr, textStatus, error);
                                    });
                                } else {
                                    jQuery('body').trigger('milestoneEdit', [milestoneId, trigger]);
                                }
                            }
                        });
                    }
                }
            ];

            // Create bootbox modal
            var modal = createBootboxDialog(title, content, buttons, trigger);

            // Make form init when dialog is opened.
            modal.on('shown.bs.modal', function() {
                initMilestoneForm(modal, true);
            });

            // Open bootbox modal
            modal.modal('show');
        })
        .fail(function(jqXhr, textStatus, error) {
            handleAjaxError(jqXhr, textStatus, error);
        });
    });

    body.on('milestoneDelete', function(event, milestoneId, trigger) {
        bootbox.confirm({
            title: 'danger - danger - danger',
            message: 'Are you sure of milesone delete?',
            buttons: {
                'cancel': {
                    className: 'btn-default pull-left'
                },
                'confirm': {
                    label: 'Delete',
                    className: 'btn-danger pull-right'
                }
            },
            callback: function(result) {
                if (result) {
                    jQuery.ajax({
                        type: "DELETE",
                        url: "/milestone/" + milestoneId,
                        dataType: 'json'
                    })
                    .done(function() {
                        makeMessage("Milestone deleted successfully.", "success", {});

                        handleEventTrigger(trigger);
                    })
                    .fail(function(jqXhr, textStatus, error) {
                        handleAjaxError(jqXhr, textStatus, error);
                    });
                } else {
                    handleEventTrigger(trigger);
                }
            }
        });
    });
});
