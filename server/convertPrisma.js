import fs from 'fs';

let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

const toCamel = (s) => {
  return s.replace(/([_][a-z0-9])/gi, ($1) => {
    return $1.toUpperCase().replace('_', '');
  });
};

code = code.split('\n').map(line => {
  // If it's a model field definition
  const match = line.match(/^(\s*)([a-z0-9_]+)(\s+[a-zA-Z0-9\[\]\?]+)(.*)$/);
  
  if (match) {
    const [_, indent, fieldName, typeDef, rest] = match;
    
    // Ignore lines that don't have an underscore in the name
    if (fieldName.includes('_')) {
      const camelName = toCamel(fieldName);
      
      let newRest = rest;
      // If it doesn't have a @map and it's not a relation field (lists or types that aren't primitives)
      // Usually relations don't need @map, database columns do. But Prisma complains if @map is on a relation field
      // We will check if typeDef contains simple type (String, Int, Boolean, DateTime, Float, Enum, Decimal)
      // Let's just blindly add @map if it's a primitive column
      const isPrimitive = /String|Int|Boolean|DateTime|Float|Decimal/.test(typeDef) || rest.includes('@map');
      
      if (!rest.includes('@map') && isPrimitive && !rest.includes('@relation')) {
          newRest = `${rest} @map("${fieldName}")`;
      }
      
      return `${indent}${camelName}${typeDef}${newRest}`;
    }
  }

  // Also fix @relation arrays, e.g., @relation("name", fields: [created_by], references: [id])
  if (line.includes('@relation') && line.includes('fields:')) {
    line = line.replace(/fields:\s*\[([a-z0-9_,\s]+)\]/, (match, fieldsStr) => {
      const fields = fieldsStr.split(',').map(f => toCamel(f.trim()));
      return `fields: [${fields.join(', ')}]`;
    });
  }

  // Fix @@index([user_id])
  if (line.includes('@@index') || line.includes('@@unique')) {
    line = line.replace(/\[([a-z0-9_,\s]+)\]/, (match, fieldsStr) => {
      const fields = fieldsStr.split(',').map(f => toCamel(f.trim()));
      return `[${fields.join(', ')}]`;
    });
  }

  return line;
}).join('\n');

fs.writeFileSync('prisma/schema.prisma', code);
console.log('Done mapping schema.prisma to camelCase!');
