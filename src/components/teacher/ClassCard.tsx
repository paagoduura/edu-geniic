import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Eye, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClassCardProps {
  classData: {
    id: string;
    name: string;
    class_level: string;
    section: string | null;
    subject: string | null;
    academic_year: string;
    is_active: boolean;
    student_count?: number;
  };
}

const classLevelLabels: Record<string, string> = {
  primary_1: 'Primary 1', primary_2: 'Primary 2', primary_3: 'Primary 3',
  primary_4: 'Primary 4', primary_5: 'Primary 5', primary_6: 'Primary 6',
  jss_1: 'JSS 1', jss_2: 'JSS 2', jss_3: 'JSS 3',
  ss_1: 'SS 1', ss_2: 'SS 2', ss_3: 'SS 3',
};

const subjectLabels: Record<string, string> = {
  mathematics: 'Mathematics', english: 'English', science: 'Science',
  physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology',
  social_studies: 'Social Studies', yoruba: 'Yoruba', hausa: 'Hausa',
  igbo: 'Igbo', french: 'French', basic_science: 'Basic Science',
  basic_technology: 'Basic Technology', home_economics: 'Home Economics',
  civic_education: 'Civic Education', agriculture: 'Agriculture',
  business_studies: 'Business Studies', economics: 'Economics',
  geography: 'Geography', literature: 'Literature', government: 'Government',
  crk: 'CRK', irk: 'IRK',
};

export const ClassCard = ({ classData }: ClassCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="border-2 hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{classData.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {classLevelLabels[classData.class_level] || classData.class_level}
              {classData.section && ` • Section ${classData.section}`}
            </p>
          </div>
          {!classData.is_active && <Badge variant="secondary">Archived</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {classData.subject && (
            <Badge variant="outline">{subjectLabels[classData.subject] || classData.subject}</Badge>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {classData.student_count ?? 0} students
            </span>
            <span>{classData.academic_year}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/teacher/classes/${classData.id}`)}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/teacher/classes/${classData.id}`)}>
              <Settings className="w-4 h-4 mr-1" />
              Manage
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
