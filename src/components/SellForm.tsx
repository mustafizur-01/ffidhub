import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const formSchema = z.object({
  id_level: z.number().min(1, 'Level must be at least 1').max(100, 'Level cannot exceed 100'),
  login_method: z.enum(['FB', 'Google', 'VK']),
  key_items: z.string().min(10, 'Please describe key items (at least 10 characters)').max(500),
  price: z.number().min(100, 'Minimum price is ₹100'),
  contact_number: z.string().regex(/^\d{10}$/, 'Enter valid 10-digit WhatsApp number'),
  account_login_id: z.string().min(1, 'Login ID is required'),
  account_password: z.string().min(1, 'Password is required'),
  is_email_binded: z.boolean(),
  binded_email: z.string().email('Enter valid email').optional().or(z.literal('')),
  security_code: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

const SellForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id_level: 1,
      login_method: 'FB',
      key_items: '',
      price: 100,
      contact_number: '',
      is_email_binded: false,
      binded_email: '',
      security_code: '',
    },
  });

  const isEmailBinded = form.watch('is_email_binded');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error('Please login to post a listing');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('id-screenshots')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('id-screenshots')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('id_listings').insert({
        id_level: values.id_level,
        login_method: values.login_method,
        key_items: values.key_items,
        price: values.price,
        contact_number: values.contact_number,
        image_url: imageUrl,
        is_email_binded: values.is_email_binded,
        binded_email: values.is_email_binded ? values.binded_email : null,
        security_code: values.is_email_binded ? values.security_code : null,
        seller_id: user.id,
      });

      if (error) throw error;

      toast.success('🔥 ID Listed Successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ID Level */}
          <FormField
            control={form.control}
            name="id_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID Level</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 65"
                    className="input-gaming"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Login Method */}
          <FormField
            control={form.control}
            name="login_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Login Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="input-gaming">
                      <SelectValue placeholder="Select login method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="FB">Facebook</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="VK">VK</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 5000"
                    className="input-gaming"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Contact Number */}
          <FormField
            control={form.control}
            name="contact_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp Number</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="10-digit number"
                    className="input-gaming"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Key Items */}
        <FormField
          control={form.control}
          name="key_items"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key Items (Evo Guns, Bundles, etc.)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe rare items: Cobra Bundle, Evo M1887, Hip Hop Set, Diamonds..."
                  className="input-gaming min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload */}
        <div className="space-y-2">
          <Label>ID Screenshot</Label>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 rounded-lg object-contain"
                />
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload ID screenshot
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Max 5MB • PNG, JPG
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Email Bind Section */}
        <div className="card-gaming p-4 space-y-4">
          <FormField
            control={form.control}
            name="is_email_binded"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel className="text-base">Is Email Binded?</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Enable if your ID has email security bound
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isEmailBinded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border animate-slide-up">
              <FormField
                control={form.control}
                name="binded_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Binded Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        className="input-gaming"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="security_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security / Permanent Code</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter security code"
                        className="input-gaming"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="gaming"
          size="xl"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Posting...
            </>
          ) : (
            '🔥 Post ID for Sale'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default SellForm;
