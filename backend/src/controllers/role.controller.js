const roleService = require("../services/role.service");


// GET /api/roles
const getRoles = (req, res) => {
    try {
        const roles = roleService.getRoles();

        res.json({
            success: true,
            roles
        });

    } catch (error) {
        console.error("Error fetching roles:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch roles"
        });
    }
};


// GET /api/roles/:roleId
const getRole = (req, res) => {
    try {
        const { roleId } = req.params;

        const role = roleService.getRole(roleId);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: `Role not found: ${roleId}`
            });
        }

        res.json({
            success: true,
            role
        });

    } catch (error) {
        console.error("Error fetching role:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch role"
        });
    }
};


// GET /api/roles/:roleId/skills
const getRoleSkills = (req, res) => {
    try {
        const { roleId } = req.params;

        const result = roleService.getRoleSkills(roleId);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error("Error resolving role skills:", error);

        if (error.message.startsWith("Role not found")) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to resolve role skills"
        });
    }
};


module.exports = {
    getRoles,
    getRole,
    getRoleSkills
};