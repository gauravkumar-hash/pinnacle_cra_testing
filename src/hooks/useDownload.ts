import supabase from "@/services/supabase";
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";

export const useDownload = (getUrl: (params: any) => string, defaultFilename: string) => {
  const defaultExt = defaultFilename.split('.').pop()?.toUpperCase()
  const downloadMutation = useMutation({
    mutationFn: async (params: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const url = `${import.meta.env.VITE_ADMIN_API_URL}${getUrl(params)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Extract filename from Content-Disposition header
      let filename = defaultFilename
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('attachment')) {
        // Extract filename using regex
        const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      return { blob, filename };
    },
    onSuccess: ({ blob, filename }) => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      message.success(`${defaultExt} exported successfully`);
    },
    onError: (error) => {
      message.error(`Failed to export ${defaultExt}`);
      console.error(error);
    }
  });

  return downloadMutation
}