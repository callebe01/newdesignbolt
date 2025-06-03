import React from 'react';
import { UserPlus, Mail, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const TeamMembers: React.FC = () => {
  // Mock team members data
  const teamMembers = [
    {
      id: '1',
      name: 'Alex Johnson',
      email: 'alex@designinsights.co',
      role: 'Admin',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
      id: '2',
      name: 'Sarah Williams',
      email: 'sarah@designinsights.co',
      role: 'Designer',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    {
      id: '3',
      name: 'Michael Chen',
      email: 'michael@designinsights.co',
      role: 'Designer',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '4',
      name: 'Emma Rodriguez',
      email: 'emma@designinsights.co',
      role: 'Product Manager',
      avatar: 'https://i.pravatar.cc/150?img=9',
    },
  ];
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team Members</h1>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      <div className="space-y-4">
        {teamMembers.map(member => (
          <Card key={member.id} className="transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                    <img 
                      src={member.avatar} 
                      alt={member.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-1 h-3 w-3" />
                      {member.email}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="px-3 py-1 text-sm bg-muted rounded-full mr-4">
                    {member.role}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};