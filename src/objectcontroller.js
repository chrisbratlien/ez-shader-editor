function ObjectController(obj, options) {
    this._constructor(obj, options);
}

ObjectController.prototype._constructor = function (obj, options) {
    this._obj = obj;
    this._rotation_speed = options && options.rotation_speed || 10.0;
    this._move_speed = options && options.move_speed || 20.0;
    this._zoom_speed = options && options.move_speed || 10.0;
}

ObjectController.prototype.move = function (v) {
    this._obj.move(v);
}

ObjectController.prototype.rotate = function (angle_in_deg, axis) {
    this._obj.rotate(angle_in_deg, axis);
}

function CameraController(obj, options) {
    this._constructor(obj, options);
    this._delta_threshold = 1.0;
}
extendClass(CameraController, ObjectController);

CameraController.prototype.orbit = function (angle_in_deg, axis, center) {
    this._obj.orbit(angle_in_deg, axis, center);
}

CameraController.prototype.orbitDistanceFactor = function (f, center) {
    this._obj.orbit(f, center);
}

CameraController.prototype.handleMouseWheel = function (e) {
    this._obj.orbitDistanceFactor(1 + App.dt * -this._zoom_speed * (e.deltaY > 1 ? -1 : 1));
}

CameraController.prototype.orbit = function (e) {
    var delta = e.deltax > this._delta_threshold || e.deltax < -this._delta_threshold ? e.deltax : 0;
    this._obj.orbit(App.dt * delta * this._rotation_speed, [0, -1, 0]);
    this._obj.updateMatrices();
    delta = e.deltay > this._delta_threshold || e.deltay < -this._delta_threshold ? e.deltay : 0;
    var right = this._obj.getLocalVector([-1, 0, 0]);
    this._obj.orbit(App.dt * delta * this._rotation_speed, right);
}

CameraController.prototype.rotate = function (e) {
    var delta = e.deltax > this._delta_threshold || e.deltax < -this._delta_threshold ? e.deltax : 0;
    this._obj.rotate(App.dt * -delta * this._rotation_speed, [0, 1, 0], [0, 0, 0]);
    delta = e.deltay > this._delta_threshold || e.deltay < -this._delta_threshold ? e.deltay : 0;
    var right = this._obj.getLocalVector([1, 0, 0]);
    this._obj.rotate(App.dt * -delta * this._rotation_speed, right, [0, 0, 0]);

}

CameraController.prototype.move = function (e) {
    this._obj.moveLocal([-e.deltax * App.dt, e.deltay * App.dt, 0]);
}

CameraController.prototype.handleMouseMove = function (e) {
    if (e.dragging) {

        if (e.leftButton) {
            this.orbit(e);
        } else if (e.rightButton) {
            this.rotate(e);
        } else {
            this.move(e);
        }
    }
}

CameraController.prototype.handleMouseDown = function (e) {
}

function NodeController(obj, options) {
    this._constructor(obj, options);
    this._is_gizmo = false;
    this._selected_gizmo = null;
    this._node_temp = new RD.SceneNode();
    this._node_temp.id = "bounding";
    this._node_temp.mesh = "bounding";
    this._node_temp.primitive = gl.LINES;
    this._node_temp.color = [0.3, 0.7, 0.56];
    // TODO the attributes the ui must show
    this._ui_attributes = [
        "color",
        "position"
    ];
    this._gizmo_activate = false;
    this._gizmo = new RD.SceneNode();
    this._gizmo.id = "gizmo";
    //TODO gizmo needs to take into account the camera setup for the movement
    var gizmoX = createGizmoAxis("gizmoX", [1, 0 , 0 ], [0, 90 * DEG2RAD, 0],
        function (e) {
            return [e.deltax * App.dt, 0 , 0];
        });
    this._gizmo.addChild(gizmoX);
    var gizmoY = createGizmoAxis("gizmoY", [0, 1 , 0 ], [0, 0, 0],
        function (e) {
            return [0, -e.deltay * App.dt , 0];
        });
    this._gizmo.addChild(gizmoY);
    var gizmoZ = createGizmoAxis("gizmoZ", [0, 0 , 1 ], [0, 0, 90 * DEG2RAD],
        function (e) {
            return [0, 0 , e.deltay * App.dt];
        });
    this._gizmo.addChild(gizmoZ);


    function createGizmoAxis(id, position, angle_euler_in_dg, delta_func) {
        var axis = new RD.SceneNode();
        axis.id = id;
        axis.mesh = "cylinder";
        axis.position = position;
        axis.flags.depth_test = false;
        axis.shader = "phong";
        axis.setRotationFromEuler(angle_euler_in_dg);
        axis.color = [ 1, 1, 1];
        axis.getMoveVec = delta_func;
        return axis;
    }
}
extendClass(NodeController, ObjectController);

NodeController.prototype.setGizmoAxis = function (node) {
    this._is_gizmo = true;
    this._selected_gizmo = node;
}

NodeController.prototype.handleMouseWheel = function (e) {
    if(this._gizmo_activate){
        // TODO resize gizmo


    }
}

NodeController.prototype.handleMouseMove = function (e) {
    if (this._is_gizmo) {
        this.move(this._selected_gizmo.getMoveVec(e));
        // TODO trigger event so the ui gets updated
        $(document).trigger("", e.obj);
    }

}

NodeController.prototype.handleMouseDown = function (e) {

    if (!this._is_gizmo) {
        this.selectNode(e.obj);
        $(document).trigger("node_selected", e.obj);
    }

}

NodeController.prototype.getScaleFactors = function () {
    var mesh = gl.meshes[this._obj.mesh];
    var min = BBox.getMin(mesh.bounding);
    var max = BBox.getMax(mesh.bounding);
    return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

NodeController.prototype.selectNode = function (node) {
    if (this._obj) {
        this._obj.removeBounding();
        this.removeGizmo();
    }

    this._obj = node;
    if (this._obj)
        this._obj.createBounding();
    this.createGizmo();
}

NodeController.prototype.createGizmo = function () {
    if (this._gizmo_activate && this._obj && !this._obj.findNode("gizmo"))
        this._obj.addChild(this._gizmo);
}

NodeController.prototype.removeGizmo = function () {
    if (this._gizmo_activate)
        this._obj.removeChild(this._gizmo);
}

NodeController.prototype.activateGizmo = function (e) {
    this._gizmo_activate = true;
    this.createGizmo();
}

NodeController.prototype.desactivateGizmo = function (e) {
    this._gizmo_activate = false;
    if (this._gizmo.parentNode)
        this._obj.removeChild(this._gizmo);
}

NodeController.prototype.desactivateTools = function (e) {
    this.desactivateGizmo();
}

NodeController.prototype.translateNode = function () {

}