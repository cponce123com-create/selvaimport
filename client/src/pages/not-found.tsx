import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" data-testid="text-404">Pagina no encontrada</h1>
          <p className="text-sm text-muted-foreground mb-6">
            La pagina que buscas no existe o fue movida.
          </p>
          <Link href="/">
            <Button data-testid="button-go-home">Volver al Inicio</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
