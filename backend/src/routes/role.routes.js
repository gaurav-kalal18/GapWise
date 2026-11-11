const express = require('express');
const { getRoles, getRole, getRoleSkills } = require('../controllers/role.controller');
const roleService = require('../services/role.service');
const { buildRubricAssessment } = require('../services/role.rubric.service');

const router = express.Router();
router.get('/roles', getRoles);
router.get('/roles/:roleId/skills', getRoleSkills);
router.get('/roles/:roleId/assessment', (req, res) => {
  try {
    const catalog = roleService.getRoleSkills(req.params.roleId);
    res.json(buildRubricAssessment(req.params.roleId, catalog));
  } catch (error) {
    if (error.message.startsWith('Role not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Role assessment failed:', error);
    return res.status(500).json({ success: false, message: 'Role assessment configuration is invalid' });
  }
});
router.get('/roles/:roleId', getRole);
module.exports = router;
