#!/bin/bash
echo "Clearing all registrations for student 32..."
curl -X DELETE http://localhost:4000/api/students/32/registrations
echo ""
echo "Done! Student 32's registrations have been cleared."
echo "Now refresh the student portal to see a clean state."
