import fs from 'fs';
import path from 'path';
import {
  BioCollectHub,
  BioCollectProject,
  BioCollectSurvey,
  BioCollectBioActivity,
  ProjectSearchQuery,
  ActivitySearchQuery,
  Facet,
} from '../schemas';

export class DataStore {
  private dataDir: string;
  private hubs: BioCollectHub[] = [];
  private projects: BioCollectProject[] = [];
  private surveys: BioCollectSurvey[] = [];
  private activities: BioCollectBioActivity[] = [];

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(__dirname, '../../data');
    this.loadData();
  }

  private loadJson<T>(filename: string): T[] {
    try {
      const filePath = path.join(this.dataDir, filename);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`Error loading ${filename}:`, err);
    }
    return [];
  }

  public loadData(): void {
    this.hubs = this.loadJson<BioCollectHub>('hubs.json');
    const rawProjects = this.loadJson<BioCollectProject>('projects.json');
    this.surveys = this.loadJson<BioCollectSurvey>('surveys.json');
    this.activities = this.loadJson<BioCollectBioActivity>('activities.json');

    // Attach surveys to projects if projectActivities is missing or empty
    this.projects = rawProjects.map((proj) => {
      const existingActivities = Array.isArray(proj.projectActivities) ? proj.projectActivities : [];
      if (existingActivities.length > 0) {
        return { ...proj, projectActivities: existingActivities };
      }
      // Look up matching surveys from surveys.json
      const matchingSurveys = this.surveys.filter((s) => s.projectId === proj.projectId);
      return {
        ...proj,
        projectActivities: matchingSurveys,
      };
    });
  }

  public reset(): void {
    this.loadData();
  }

  // 1. Hubs
  public getHubs(): BioCollectHub[] {
    return this.hubs;
  }

  // 2. Projects Search
  public searchProjects(query: ProjectSearchQuery): {
    facets: Facet[];
    total: number;
    projects: BioCollectProject[];
  } {
    let filtered = [...this.projects];

    // Filter by hub
    if (query.hub && query.hub.trim() !== '') {
      filtered = filtered.filter((p) => p.hub?.toLowerCase() === query.hub?.toLowerCase());
    }

    // Filter by fq (filter query)
    const fqList = Array.isArray(query.fq) ? query.fq : [query.fq];
    for (const fq of fqList) {
      if (fq === 'isExternal:F') {
        filtered = filtered.filter((p) => p.isExternal !== true);
      } else if (fq === 'isExternal:T') {
        filtered = filtered.filter((p) => p.isExternal === true);
      }
    }

    // Filter by text search q / queryText
    const searchText = query.q || query.queryText;
    if (searchText) {
      const cleanTerm = searchText.replace(/\*/g, '').toLowerCase().trim();
      if (cleanTerm) {
        filtered = filtered.filter((p) => {
          const inName = p.name?.toLowerCase().includes(cleanTerm);
          const inDesc = p.description?.toLowerCase().includes(cleanTerm);
          const inAim = p.aim?.toLowerCase().includes(cleanTerm);
          return inName || inDesc || inAim;
        });
      }
    }

    // Sort order
    if (query.sort === 'nameSort') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (query.sort === 'dateCreatedSort') {
      filtered.sort((a, b) => {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return db - da;
      });
    }

    const total = filtered.length;
    const offset = query.offset ?? 0;
    const max = query.max ?? 30;
    const paginated = filtered.slice(offset, offset + max);

    // Build standard facets compliant with contract
    const hubCounts: Record<string, number> = {};
    for (const p of filtered) {
      if (p.hub) {
        hubCounts[p.hub] = (hubCounts[p.hub] || 0) + 1;
      }
    }
    const facets: Facet[] = [
      {
        name: 'hub',
        title: 'Hub',
        entries: Object.keys(hubCounts).map((h) => `${h} (${hubCounts[h]})`),
        total: Object.keys(hubCounts).length,
      },
    ];

    return {
      facets,
      total,
      projects: paginated,
    };
  }

  // 3. Project by ID
  public getProjectById(projectId: string): BioCollectProject | undefined {
    return this.projects.find((p) => p.projectId === projectId);
  }

  // 4. Surveys by Project ID
  public getSurveysByProjectId(projectId: string): BioCollectSurvey[] {
    // Check if project has projectActivities, or check surveys.json
    const project = this.getProjectById(projectId);
    if (project && project.projectActivities && project.projectActivities.length > 0) {
      return project.projectActivities;
    }
    return this.surveys.filter((s) => s.projectId === projectId);
  }

  // 5. BioActivities Search
  public searchActivities(
    query: ActivitySearchQuery,
    authUserId?: string
  ): { activities: BioCollectBioActivity[] } {
    let filtered = [...this.activities];

    // Filter by view
    if (query.view === 'myrecords') {
      const targetUserId = query.userId || authUserId || 'mock-user-ecologist-001';
      filtered = filtered.filter((a) => a.userId === targetUserId);
    } else if (query.view === 'project') {
      if (query.projectId) {
        filtered = filtered.filter((a) => a.projectId === query.projectId);
      }
    }

    // Additional filter by projectId if specified
    if (query.projectId && query.view !== 'project') {
      filtered = filtered.filter((a) => a.projectId === query.projectId);
    }

    // Search term matching
    if (query.searchTerm) {
      const st = query.searchTerm.toLowerCase().trim();
      filtered = filtered.filter((a) => {
        const inName = a.name?.toLowerCase().includes(st);
        const inProject = a.projectName?.toLowerCase().includes(st);
        const inOwner = a.activityOwnerName?.toLowerCase().includes(st);
        const inRecords = a.records?.some(
          (r) => r.name?.toLowerCase().includes(st) || r.commonName?.toLowerCase().includes(st)
        );
        return inName || inProject || inOwner || inRecords;
      });
    }

    const offset = query.offset ?? 0;
    const max = query.max ?? 20;
    const paginated = filtered.slice(offset, offset + max);

    return {
      activities: paginated,
    };
  }

  // 6. Delete BioActivity
  public deleteActivity(activityId: string): boolean {
    const prevLength = this.activities.length;
    this.activities = this.activities.filter((a) => a.activityId !== activityId);
    return this.activities.length < prevLength;
  }
}

export const store = new DataStore();
