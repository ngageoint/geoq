from django.views.generic import ListView

from django.http import HttpResponse
from models import Job
from geoq.maps.models import FeatureType
from django.shortcuts import get_object_or_404
from datetime import datetime
from pytz import timezone


class JobKML(ListView):

    model = Job

    def get(self, request, *args, **kwargs):
        job = get_object_or_404(Job, pk=self.kwargs.get('pk'))

        feature_types = FeatureType.objects.all()

        aoi_count = job.aois.count()
        aoi_complete = job.complete().count()
        aoi_work = job.in_work().count()

        description = 'Job #'+str(job.id)+': '+str(job.name)+'\n'+str(job.project.name)+'\n'

        if aoi_count == 0:
            output = '<?xml version="1.0" encoding="UTF-8"?>\n'
            output += '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
            output += '  <Document>\n'
            output += '    <name>Empty Job</name>\n'
            output += '    <description>'+description+'</description>\n'
            output += '  </Document>\n'
            output += '</kml>\n'
            return HttpResponse(output, mimetype="application/vnd.google-earth.kml+xml", status=200)

        aoi_comp_pct = (100 * float(aoi_complete)/float(aoi_count))
        aoi_work_pct = int(100 * float(aoi_work)/float(aoi_count))
        aoi_tot_pct = int(100 * float(aoi_work+aoi_complete)/float(aoi_count))

        doc_name = 'GeoQ C:'+str(aoi_complete)+', W:'+str(aoi_work)+', Tot:'+str(aoi_count)+' ['+str(aoi_tot_pct)+'%]'
        description = description + 'Complete Cells: ' + str(aoi_complete) + ' ['+str(aoi_comp_pct)+'%], In Work: ' + str(aoi_work) + ' ['+str(aoi_work_pct)+'%], Total: ' + str(aoi_count)

        output = '<?xml version="1.0" encoding="UTF-8"?>\n'
        output += '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        output += '  <Document>\n'
        output += '    <name>'+doc_name+'</name>\n'
        output += '    <description>'+description+'</description>\n'
        output += '    <Style id="geoq_inwork">\n'
        output += '      <LineStyle>\n'
        output += '        <width>3</width>\n'
        output += '        <color>7f00ffff</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        output += '    <Style id="geoq_complete">\n'
        output += '      <LineStyle>\n'
        output += '        <width>2</width>\n'
        output += '        <color>7f00ff00</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        output += '    <Style id="geoq_unassigned">\n'
        output += '      <LineStyle>\n'
        output += '        <width>1</width>\n'
        output += '        <color>7f0000ff</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        for feature in feature_types:
            output += '    <Style id="geoq_'+str(feature.id)+'">\n'
            if feature.style.has_key('weight'):
                output += '      <LineStyle>\n'
                output += '        <width>'+str(feature.style['weight'])+'</width>\n'
                output += '      </LineStyle>\n'

            if feature.style.has_key('color'):
                color = feature.style['color']
                #TODO: Maybe use webcolors and name_to_hex to convert color names to hex colors
                if color == 'orange':
                    color = '7f0066ff' # NOTE: 7f means Using 50% transparency, and switch hex colors around - ttbbggrr
                if color == 'red':
                    color = '7f0000ff'
                if color == 'green':
                    color = '7f00ff00'
                if color == 'blue':
                    color = '7fff000000'
                output += '      <PolyStyle>\n'
                output += '        <color>'+color+'</color>\n'
                output += '        <colorMode>normal</colorMode>\n'
                output += '        <fill>1</fill>\n'
                output += '        <outline>1</outline>\n'
                output += '      </PolyStyle>\n'

            if feature.style.has_key('iconUrl'):
                icon_url = str(feature.style['iconUrl'])
                if not icon_url.startswith("http"):
                    icon_url = request.build_absolute_uri(icon_url)

                output += '      <IconStyle>\n'
                output += '        <Icon>\n'
                output += '          <href>'+icon_url+'</href>\n'
                output += '        </Icon>\n'
                output += '      </IconStyle>\n'
            output += '    </Style>\n'

        # locations = job.feature_set.all().order_by('template')
        locations = job.feature_set.all()\
            .extra(tables=['maps_featuretype'])\
            .extra(where=['maps_featuretype.id=maps_feature.template_id'])\
            .order_by('maps_featuretype.name')

        last_template = ""
        for loc in locations:
            template_name = str(loc.template.name)
            if template_name != last_template:
                if last_template != "":
                    output += '   </Folder>\n'
                output += '   <Folder><name>'+template_name+'</name>\n'
                last_template = template_name

            analyst_name = str(loc.analyst.username)
            dtg = str(loc.created_at)
            job_id = str(loc.job.id)
            #TODO: Add links to Jobs and Projects

            datetime_obj = datetime.strptime(dtg, "%Y-%m-%d %H:%M:%S.%f+00:00")
            datetime_obj_utc = datetime_obj.replace(tzinfo=timezone('UTC'))

            date_time = datetime_obj_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
            date_time_desc = datetime_obj_utc.strftime('%Y-%m-%d %H:%M:%S')

            desc = 'Posted by '+analyst_name+' at '+date_time_desc+' Zulu (UTC) in Job #'+job_id

            output += '    <Placemark><name>'+template_name+'</name>\n'
            output += '      <TimeStamp><when>'+date_time+'</when></TimeStamp>\n'
            output += '      <description>'+desc+'</description>\n'
            output += '      <styleUrl>#geoq_'+str(loc.template.id)+'</styleUrl>\n'
            output += '      '+str(loc.the_geom.kml)+'\n'
            output += '    </Placemark>\n'

        output += '   </Folder>\n'
        output += '   <Folder><name>Work Cells</name>\n'
        aois = job.aois.order_by('status')
        for aoi in aois:
            style = 'complete'
            if aoi.status == 'In work':
                style = 'inwork'
            if aoi.status == 'Unassigned':
                style = 'unassigned'
            aoi_name = "#"+str(aoi.id)+", "+str(aoi.status)+" - Priority:"+str(aoi.priority)
            output += '    <Placemark>\n'
            output += '      <name>'+aoi_name+'</name>\n'
            output += '      <styleUrl>#geoq_'+style+'</styleUrl>\n'
            output += '      '+str(aoi.polygon.kml)+'\n'
            output += '    </Placemark>\n'

        output += '   </Folder>\n'
        output += '  </Document>\n'
        output += '</kml>'

        return HttpResponse(output, mimetype="application/vnd.google-earth.kml+xml", status=200)


class JobKMLNetworkLink(ListView):

    model = Job

    def get(self, request, *args, **kwargs):
        id = self.kwargs.get('pk')
        job = get_object_or_404(Job, pk=id)

        url = request.build_absolute_uri('/geoq/api/job/'+id+'.kml')

        aoi_count = job.aois.count()
        aoi_complete = job.complete().count()
        aoi_work = job.in_work().count()

        aoi_comp_pct = int(100 * float(aoi_complete)/float(aoi_count))
        aoi_work_pct = int(100 * float(aoi_work)/float(aoi_count))
        aoi_tot_pct = int(100 * float(aoi_work+aoi_complete)/float(aoi_count))

        doc_name = 'GeoQ C:'+str(aoi_complete)+', W:'+str(aoi_work)+', Tot:'+str(aoi_count)+' ['+str(aoi_tot_pct)+'%]'

        description = 'Job #'+str(job.id)+': '+str(job.name)+'\n'+str(job.project.name)+'\n'
        description = description + 'Complete Cells: ' + str(aoi_complete) + ' ['+str(aoi_comp_pct)+'%], In Work: ' + str(aoi_work) + ' ['+str(aoi_work_pct)+'%], Total: ' + str(aoi_count)

        output = '<?xml version="1.0" encoding="UTF-8"?>\n'
        output += '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        output += '  <Folder>\n'
        output += '    <name>GeoQ Worked Cells</name>\n'
        output += '    <visibility>1</visibility>\n'
        output += '    <open>1</open>\n'
        output += '    <description>Work progress from GeoQ</description>\n'
        output += '    <NetworkLink>\n'
        output += '      <name>'+doc_name+'</name>\n'
        output += '      <visibility>1</visibility>\n'
        output += '      <open>1</open>\n'
        output += '      <description>'+description+'</description>\n'
        output += '      <refreshVisibility>0</refreshVisibility>\n'
        output += '      <flyToView>0</flyToView>\n'
        output += '      <Link>\n'
        output += '        <href>'+url+'</href>\n'
        output += '        <refreshInterval>120</refreshInterval>\n'  # Refresh every 2 min
        output += '        <refreshMode>onInterval</refreshMode>\n'
        output += '        <viewRefreshTime>10</viewRefreshTime>\n'   # Also refresh after viewscreen movement
        output += '        <viewRefreshMode>onStop</viewRefreshMode>\n'
        output += '      </Link>\n'
        output += '    </NetworkLink>\n'
        output += '  </Folder>\n'
        output += '</kml>'

        return HttpResponse(output, mimetype="application/vnd.google-earth.kml+xml", status=200)

