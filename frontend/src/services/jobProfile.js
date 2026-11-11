// Use this file only if your existing jobProfile.js matches the earlier adapter.
// The important change is preservation of `anyOf`, not the rest of this adapter.
export const roleToJobProfile = (data) => {
  const toRequirement = (skill, requirementType) => ({
    skill: skill.canonicalName,
    canonicalSkillId: skill.id,
    requirementType,
    ...(Array.isArray(skill.anyOf) ? { anyOf: skill.anyOf } : {}),
  });

  return {
    title: data.role.name,
    company: '',
    roleId: data.role.id,
    requiredSkills: [
      ...(data.skills?.essential || []).map(skill => toRequirement(skill, 'required')),
      ...(data.skills?.optional || []).map(skill => toRequirement(skill, 'preferred')),
    ],
    assessment: data.assessment || null,
  };
};
