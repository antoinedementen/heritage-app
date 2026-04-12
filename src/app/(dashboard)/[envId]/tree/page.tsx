"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { Plus, Search, ZoomIn, ZoomOut, Crosshair, Calendar, GitBranch } from "lucide-react";
import { useTreeStore } from "@/stores/treeStore";
import { useAuth } from "@/hooks/useAuth";
import { useTreeData } from "@/hooks/useTreeData";
import { PersonNode } from "@/components/tree/PersonNode";
import { CoupleNode } from "@/components/tree/CoupleNode";
import { ParentEdge, SpouseEdge } from "@/components/tree/TreeEdges";
import { AddPersonModal } from "@/components/people/AddPersonModal";
import { RelationshipFinder } from "@/components/tree/RelationshipFinder";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import type { Person } from "@/lib/supabase/queries/people";

// ─── Node / Edge type registrations ──────────────────────────────────────────
const nodeTypes: NodeTypes = {
  person: PersonNode,
  couple: CoupleNode,
};

const edgeTypes: EdgeTypes = {
  parent: ParentEdge,
  spouse: SpouseEdge,
};

// ─── Side panel ───────────────────────────────────────────────────────────────
function PersonPanel({
  person,
  envId,
  onClose,
  onFocus,
}: {
  person: Person;
  envId: string;
  onClose: () => void;
  onFocus: (id: string) => void;
}) {
  const router = useRouter();
  const { isGuest } = useAuth();

  const dateStr = (() => {
    if (person.birth_date && person.death_date)
      return `${formatDate(person.birth_date)} — ${formatDate(person.death_date)}`;
    if (person.birth_date)
      return `Né${person.gender === "female" ? "e" : ""} le ${formatDate(person.birth_date)}`;
    return null;
  })();

  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-heritage-white border-l border-heritage-sand/40 shadow-xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-heritage-sand/30 px-4 py-3">
        <span className="text-sm font-medium text-heritage-dark">Fiche résumée</span>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-heritage-brown hover:bg-heritage-beige transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col items-center text-center gap-2">
          <Avatar
            src={person.photo_url}
            firstName={person.first_name}
            lastName={person.last_name}
            size="lg"
          />
          <div>
            <h2 className="font-serif text-lg font-semibold text-heritage-dark">
              {person.first_name} {person.last_name}
            </h2>
            {dateStr && <p className="text-xs text-heritage-brown">{dateStr}</p>}
            {person.profession && (
              <p className="mt-1 text-xs text-heritage-brown/80">{person.profession}</p>
            )}
            <div className="mt-2">
              {person.is_alive ? (
                <Badge variant="success">En vie</Badge>
              ) : (
                <Badge variant="neutral">Décédé{person.gender === "female" ? "e" : ""}</Badge>
              )}
            </div>
          </div>
        </div>

        {person.bio && (
          <p className="text-xs text-heritage-brown leading-relaxed line-clamp-4">
            {person.bio}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-heritage-sand/30 p-3 space-y-2">
        <Button
          size="sm"
          fullWidth
          onClick={() => router.push(`/${envId}/people/${person.id}`)}
        >
          Voir la fiche complète
        </Button>
        <Button
          size="sm"
          variant="secondary"
          fullWidth
          onClick={() => onFocus(person.id)}
        >
          Centrer l'arbre ici
        </Button>
      </div>
    </div>
  );
}

// ─── Inner tree component (needs ReactFlowProvider context) ───────────────────
function TreeInner({
  envId,
  isGuest,
}: {
  envId: string;
  isGuest: boolean;
}) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const router = useRouter();

  // Store: listens for omnisearch selections + relationship path
  const { treeFocusId, highlightPersonId, pathPersonIds, clearHighlight, clearPath } = useTreeStore();

  const [focusId, setFocusId] = useState<string | null>(null);
  const [showDates, setShowDates] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [relFinderOpen, setRelFinderOpen] = useState(false);
  const [focusSearch, setFocusSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { nodes: layoutNodes, edges: layoutEdges, allPeople, isLoading, defaultFocusId } =
    useTreeData(envId, focusId, showDates);

  // Set default focus on load
  useEffect(() => {
    if (!focusId && defaultFocusId) {
      setFocusId(defaultFocusId);
    }
  }, [defaultFocusId, focusId]);

  // React to omnisearch focus requests
  useEffect(() => {
    if (treeFocusId && treeFocusId !== focusId) {
      setFocusId(treeFocusId);
    }
  }, [treeFocusId]); // eslint-disable-line

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync layout changes to ReactFlow — inject highlight + path flags
  useEffect(() => {
    const enriched = layoutNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        isHighlighted: n.id === highlightPersonId,
        isOnPath: pathPersonIds.size > 0 && pathPersonIds.has(n.id),
      },
    }));
    setNodes(enriched);
    setEdges(layoutEdges);
    setTimeout(() => fitView({ duration: 500, padding: 0.15 }), 50);
  }, [layoutNodes, layoutEdges, highlightPersonId, pathPersonIds, setNodes, setEdges, fitView]);

  // Clear highlight after 2 s
  useEffect(() => {
    if (!highlightPersonId) return;
    const t = setTimeout(() => clearHighlight(), 2000);
    return () => clearTimeout(t);
  }, [highlightPersonId, clearHighlight]);

  // Focus on a new person
  function handleFocus(id: string) {
    setFocusId(id);
    setSelectedPerson(null);
    setFocusSearch("");
    setShowSearch(false);
  }

  // Handle node click — show side panel
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type !== "person") return;
      const person = node.data.person as Person;
      setSelectedPerson(person);
    },
    []
  );

  // Handle double-click — recentre on this person
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type !== "person") return;
      handleFocus(node.id);
    },
    [] // eslint-disable-line
  );

  // Filter people for search
  const searchResults = focusSearch.length >= 2
    ? allPeople.filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(focusSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  // Close search on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Element)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const focusPerson = allPeople.find((p) => p.id === focusId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (allPeople.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Aucune personne dans cet arbre"
        description="Commencez par ajouter des personnes depuis la page Personnes."
        action={
          !isGuest
            ? { label: "Ajouter une personne", onClick: () => setAddPersonOpen(true) }
            : undefined
        }
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 rounded-xl bg-heritage-white/95 backdrop-blur-sm border border-heritage-sand/40 shadow-lg px-3 py-2">

        {/* Focus search */}
        <div ref={searchRef} className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-heritage-sand bg-heritage-cream px-3 h-8">
            <Search className="h-3.5 w-3.5 text-heritage-brown shrink-0" />
            <input
              type="text"
              placeholder={focusPerson ? `${focusPerson.first_name} ${focusPerson.last_name}` : "Centrer sur…"}
              value={focusSearch}
              onFocus={() => setShowSearch(true)}
              onChange={(e) => { setFocusSearch(e.target.value); setShowSearch(true); }}
              className="w-44 bg-transparent text-sm text-heritage-dark placeholder:text-heritage-brown/60 focus:outline-none"
            />
          </div>

          {/* Dropdown results */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-64 rounded-xl bg-heritage-white border border-heritage-sand shadow-xl overflow-hidden z-50">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleFocus(p.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-heritage-beige transition-colors"
                >
                  <Avatar src={p.photo_url} firstName={p.first_name} lastName={p.last_name} size="sm" />
                  <span className="text-heritage-dark">
                    {p.first_name} {p.last_name}
                    {p.birth_date && (
                      <span className="ml-1 text-xs text-heritage-brown">
                        ({new Date(p.birth_date).getFullYear()})
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-heritage-sand" />

        {/* Zoom controls */}
        <button
          onClick={() => zoomIn({ duration: 200 })}
          className="rounded-lg p-1.5 text-heritage-brown hover:bg-heritage-beige transition-colors"
          title="Zoom +"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomOut({ duration: 200 })}
          className="rounded-lg p-1.5 text-heritage-brown hover:bg-heritage-beige transition-colors"
          title="Zoom -"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => fitView({ duration: 500, padding: 0.15 })}
          className="rounded-lg p-1.5 text-heritage-brown hover:bg-heritage-beige transition-colors"
          title="Recentrer"
        >
          <Crosshair className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-heritage-sand" />

        {/* Show dates toggle */}
        <button
          onClick={() => setShowDates((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors
            ${showDates
              ? "bg-heritage-forest/10 text-heritage-forest"
              : "text-heritage-brown hover:bg-heritage-beige"
            }`}
          title="Afficher les dates"
        >
          <Calendar className="h-3.5 w-3.5" />
          Dates
        </button>

        {/* Relationship finder */}
        <>
          <div className="h-5 w-px bg-heritage-sand" />
          <button
            onClick={() => setRelFinderOpen(true)}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors
              ${relFinderOpen || pathPersonIds.size > 0
                ? "bg-heritage-gold/20 text-heritage-dark"
                : "text-heritage-brown hover:bg-heritage-beige"
              }`}
            title="Calculer un lien de parenté"
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lien de parenté</span>
          </button>
          {pathPersonIds.size > 0 && (
            <button
              onClick={() => clearPath()}
              className="rounded-full bg-heritage-gold/30 px-1.5 py-0.5 text-[10px] font-medium text-heritage-dark hover:bg-heritage-gold/50 transition-colors"
              title="Effacer le chemin"
            >
              ✕ chemin
            </button>
          )}
        </>

        {/* Add person (non-guest) */}
        {!isGuest && (
          <>
            <div className="h-5 w-px bg-heritage-sand" />
            <button
              onClick={() => setAddPersonOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-heritage-forest px-2.5 py-1.5 text-xs text-white hover:bg-heritage-leaf transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </>
        )}
      </div>

      {/* ── ReactFlow canvas ──────────────────────────────────────────────── */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#D4C5A9"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "couple") return "#B8960C";
            const person = node.data?.person as Person | undefined;
            if (!person) return "#D4C5A9";
            if (person.gender === "male") return "#2D5016";
            if (person.gender === "female") return "#B8960C";
            return "#8B7355";
          }}
          maskColor="rgba(245,240,232,0.7)"
          style={{
            backgroundColor: "#FDFCFA",
            border: "1px solid #D4C5A9",
            borderRadius: "8px",
          }}
        />
        <Controls showFitView={false} showInteractive={false} />
      </ReactFlow>

      {/* ── Side panel ────────────────────────────────────────────────────── */}
      {selectedPerson && (
        <PersonPanel
          person={selectedPerson}
          envId={envId}
          onClose={() => setSelectedPerson(null)}
          onFocus={handleFocus}
        />
      )}

      {/* ── Add person modal ──────────────────────────────────────────────── */}
      <AddPersonModal
        isOpen={addPersonOpen}
        onClose={() => setAddPersonOpen(false)}
        envId={envId}
        onCreated={() => {}}
      />

      {/* ── Relationship finder modal ─────────────────────────────────────── */}
      <Modal
        isOpen={relFinderOpen}
        onClose={() => setRelFinderOpen(false)}
        title="Calculateur de parenté"
        size="md"
      >
        <RelationshipFinder
          envId={envId}
          showTreeButton={false}
          onViewInTree={() => setRelFinderOpen(false)}
        />
      </Modal>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export default function FamilyTreePage({
  params,
}: {
  params: Promise<{ envId: string }>;
}) {
  const { envId } = use(params);
  const { isGuest } = useAuth();

  return (
    // Full-height canvas: subtract header (h-14) and outer padding
    <div className="-m-4 lg:-m-8 h-[calc(100vh-3.5rem)] overflow-hidden">
      <ReactFlowProvider>
        <TreeInner envId={envId} isGuest={isGuest} />
      </ReactFlowProvider>
    </div>
  );
}
