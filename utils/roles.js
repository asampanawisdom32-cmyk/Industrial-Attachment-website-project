function mapRoleLabelToKey(label) {
  if (!label) return 'student';
  const map = {
    Admin: 'admin',
    'School Supervisor': 'school_supervisor',
    'Workplace Supervisor': 'workplace_supervisor',
    Student: 'student',
  };
  return map[label] || String(label).toLowerCase().replace(/\s+/g, '_');
}

module.exports = {
  mapRoleLabelToKey,
};
